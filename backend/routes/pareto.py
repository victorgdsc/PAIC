from utils.file_utils import load_processed_dataframe
from flask import Blueprint, request, jsonify, current_app
import pandas as pd
import os
from typing import List, Tuple

pareto_bp = Blueprint("pareto", __name__, url_prefix="/api")


def calculate_pareto(
    df: pd.DataFrame, category_col: str, value_col: str, tipo_metrica: str = "sum"
) -> Tuple[List[str], List[float], List[float]]:
    try:
        if tipo_metrica == "avg":
            df_grouped = df.groupby(category_col, as_index=False)[value_col].mean()
        elif tipo_metrica == "score":
            df_grouped = (
                df.groupby(category_col)
                .agg({value_col: ["mean", "count"]})
                .reset_index()
            )
            df_grouped.columns = [category_col, "mean", "count"]
            df_grouped["score"] = df_grouped["mean"] * df_grouped["count"]
            df_grouped = df_grouped[[category_col, "score"]]
            df_grouped = df_grouped.rename(columns={"score": value_col})
        else:
            df_grouped = df.groupby(category_col, as_index=False)[value_col].sum()

        df_sorted = df_grouped.sort_values(by=value_col, ascending=False)
        df_sorted["cumulative_sum"] = df_sorted[value_col].cumsum()
        total = df_sorted[value_col].sum()
        df_sorted["cumulative_percent"] = (
            (df_sorted["cumulative_sum"] / total) * 100 if total != 0 else 0
        )

        categories = df_sorted[category_col].astype(str).tolist()
        values = df_sorted[value_col].astype(float).round(2).tolist()
        cumulative = df_sorted["cumulative_percent"].round(2).tolist()

        return categories, values, cumulative

    except Exception as e:
        raise Exception(f"Erro ao calcular Pareto: {str(e)}")


@pareto_bp.route("/analyze/pareto-advanced", methods=["POST"])
def advanced_pareto():
    try:
        payload = request.get_json()
        if not payload:
            return jsonify({"error": "Dados não fornecidos"}), 400

        file_id = payload.get("fileId")
        fator = payload.get("fator")
        fator_valor = payload.get("fatorValor")
        data_inicio = payload.get("dataInicio")
        data_fim = payload.get("dataFim")
        tipo_metrica = payload.get("tipoMetrica", "sum")

        if not file_id or not fator:
            return jsonify({"error": "fileId e fator são obrigatórios"}), 400

        processed_file_path = os.path.join(
            current_app.config["PROCESSED_FOLDER"], f"{file_id}.parquet"
        )
        if not os.path.exists(processed_file_path):
            return jsonify({"error": "Arquivo não encontrado"}), 404

        df = pd.read_parquet(processed_file_path)

        if "delay_days" not in df.columns:
            if "actual_date" in df.columns and "estimated_date" in df.columns:
                df["actual_date"] = pd.to_datetime(df["actual_date"], errors="coerce")
                df["estimated_date"] = pd.to_datetime(
                    df["estimated_date"], errors="coerce"
                )
                df["delay_days"] = (df["actual_date"] - df["estimated_date"]).dt.days
            else:
                return (
                    jsonify(
                        {
                            "error": "Colunas de data necessárias para calcular o atraso não encontradas"
                        }
                    ),
                    400,
                )

        fatores_disponiveis = [
            col
            for col in df.columns
            if col not in ["actual_date", "estimated_date", "delay_days"]
            and (df[col].dtype == "object" or str(df[col].dtype).startswith("category"))
        ]
        if fator not in fatores_disponiveis:
            return (
                jsonify(
                    {
                        "error": "Fator não encontrado entre os fatores disponíveis do upload"
                    }
                ),
                400,
            )

        if fator_valor is not None and fator_valor != "" and fator_valor != "ALL":
            df = df[df[fator] == fator_valor]
        if data_inicio:
            df = df[df["actual_date"] >= data_inicio]
        if data_fim:
            df = df[df["actual_date"] <= data_fim]
        df = df.dropna(subset=[fator, "delay_days"])

        min_date = df["actual_date"].min()
        max_date = df["actual_date"].max()
        min_date_str = min_date.strftime("%Y-%m-%d") if pd.notnull(min_date) else None
        max_date_str = max_date.strftime("%Y-%m-%d") if pd.notnull(max_date) else None

        if df.empty:
            return (
                jsonify({"error": "Nenhum dado encontrado para os filtros aplicados"}),
                400,
            )

        categories, values, cumulative = calculate_pareto(
            df, fator, "delay_days", tipo_metrica
        )
        pareto_principal = {
            "categories": categories,
            "values": values,
            "cumulative": cumulative,
            "count": len(df),
        }

        analise_cruzada = {}
        fatores_validos = [
            col for col in df.columns if col not in ["delay_days", "actual_date"]
        ]
        if fator and payload.get("fatorValor") not in [None, "", "ALL"]:
            for other_col in fatores_validos:
                if other_col != fator:
                    try:
                        cats, vals, cumuls = calculate_pareto(
                            df, other_col, "delay_days", tipo_metrica
                        )
                        analise_cruzada[other_col] = {
                            "categories": cats,
                            "values": vals,
                            "cumulative": cumuls,
                        }
                    except Exception as e:
                        analise_cruzada[other_col] = {"error": str(e)}

        return jsonify(
            {
                "pareto_principal": pareto_principal,
                "analise_cruzada": analise_cruzada,
                "min_date": min_date_str,
                "max_date": max_date_str,
            }
        )
    except Exception as e:
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500