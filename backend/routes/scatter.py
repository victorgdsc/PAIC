from flask import Blueprint, jsonify, request
from utils.file_utils import read_csv_from_gcs, read_parquet_from_gcs, blob_exists, load_processed_dataframe
import pandas as pd
import random

scatter_bp = Blueprint("scatter", __name__, url_prefix="/api")


@scatter_bp.route("/scatter-factor-values", methods=["POST"])
def scatter_factor_values():
    try:
        payload = request.json
        file_id = payload.get("fileId")
        fator = payload.get("fator")
        data_inicio = payload.get("dataInicio")
        data_fim = payload.get("dataFim")
        if not file_id or not fator:
            return (
                jsonify({"error": "fileId e fator são obrigatórios"}),
                400,
            )
        df, load_error = load_processed_dataframe(file_id)
        if load_error or df is None:
            return (
                jsonify({"error": f"Erro ao carregar dados: {load_error}"}),
                500,
            )
        if data_inicio:
            df = df[df["actual_date"] >= data_inicio]
        if data_fim:
            df = df[df["actual_date"] <= data_fim]
        if fator not in df.columns:
            return (
                jsonify({"error": "Fator não encontrado no dataset"}),
                400,
            )
        values = df[fator].dropna().unique().tolist()
        return jsonify({"values": values}), 200
    except Exception as e:
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500


@scatter_bp.route("/scatter-metadata", methods=["POST"])
def scatter_metadata_route():
    """
    Retorna fatores categóricos (não numéricos), valores únicos de cada fator,
    menor e maior data da coluna actual_date.
    """
    try:
        payload = request.json
        file_id = payload.get("fileId")
        if not file_id:
            return jsonify({"error": "fileId não fornecido"}), 400
        df, load_error = load_processed_dataframe(file_id)
        if load_error or df is None:
            return jsonify({"error": f"Erro ao carregar dados: {load_error}"}), 500

        import json
        import os
        from flask import current_app
        columns_info = None
        try:
            processed_folder = current_app.config.get("PROCESSED_FOLDER", "processed")
            base_json = os.path.join(processed_folder, f"{file_id}_columns.json")
            alt_json = os.path.join(processed_folder, f"{file_id}_columns_info.json")
            column_mapping_json = os.path.join(processed_folder, f"{file_id}_column_mapping.json")
            if os.path.exists(base_json):
                with open(base_json, "r", encoding="utf-8") as f:
                    columns_info = json.load(f)
            elif os.path.exists(alt_json):
                with open(alt_json, "r", encoding="utf-8") as f:
                    columns_info = json.load(f)
            elif os.path.exists(column_mapping_json):
                with open(column_mapping_json, "r", encoding="utf-8") as f:
                    columns_info = json.load(f)
        except Exception:
            columns_info = None

        if columns_info:
            factors = [col["name"] for col in columns_info if (col.get("role") == "factor" and not col.get("isNumeric", False)) or ("numeric" in col["name"].lower() and not col.get("isNumeric", True))]
        else:
            exclude_cols = {"actual_date", "estimated_date", "delay_days"}
            factor_candidates = [col for col in df.columns if col not in exclude_cols]
            factors = [col for col in factor_candidates if str(df[col].dtype) in ["object", "category"] or ("numeric" in col.lower() and str(df[col].dtype) in ["int64", "float64"])]

        factor_values = {col: sorted([str(v) for v in df[col].dropna().unique()]) for col in factors}
        min_date = df["actual_date"].min()
        max_date = df["actual_date"].max()
        min_date_str = min_date.strftime("%Y-%m-%d") if pd.notnull(min_date) else None
        max_date_str = max_date.strftime("%Y-%m-%d") if pd.notnull(max_date) else None
        return jsonify({
            "factors": factors,
            "factor_values": factor_values,
            "min_date": min_date_str,
            "max_date": max_date_str
        }), 200
    except Exception as e:
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500

@scatter_bp.route("/scatter-data", methods=["POST"])
def scatter_data_route():
    try:
        payload = request.json
        file_id = payload.get("fileId")
        fator = payload.get("fator")
        fator_valor = payload.get("fatorValor")
        data_inicio = payload.get("dataInicio")
        data_fim = payload.get("dataFim")

        if not file_id:
            return jsonify({"error": "fileId não fornecido"}), 400

        df, load_error = load_processed_dataframe(file_id)
        if load_error or df is None:
            return jsonify({"error": f"Erro ao carregar dados: {load_error}"}), 500


        if data_inicio:
            df = df[df["actual_date"] >= data_inicio]
        if data_fim:
            df = df[df["actual_date"] <= data_fim]

        scatter_cols = ["actual_date", "estimated_date", "delay_days"] + [col for col in df.columns if col not in ["actual_date", "estimated_date", "delay_days"]]
        scatter_cols = [col for col in scatter_cols if col in df.columns]
        try:
            df_scatter = df[scatter_cols].dropna(subset=["actual_date", "delay_days"])
            if fator and fator in df_scatter.columns:
                if fator_valor is not None and fator_valor != "ALL":
                    df_scatter = df_scatter[df_scatter[fator] == fator_valor]
            MAX_SCATTER_ROWS = 100_000
            if len(df_scatter) > MAX_SCATTER_ROWS:
                df_scatter = df_scatter.sample(n=MAX_SCATTER_ROWS, random_state=42)
            scatter_data = df_scatter.to_dict(orient="records")
        except Exception as e:
            return jsonify({"error": f"Erro ao montar scatter: {str(e)}", "cols": list(df.columns), "scatter_cols": scatter_cols}), 500


        min_date = df["actual_date"].min()
        max_date = df["actual_date"].max()
        min_date_str = min_date.strftime("%Y-%m-%d") if pd.notnull(min_date) else None
        max_date_str = max_date.strftime("%Y-%m-%d") if pd.notnull(max_date) else None

        return (
            jsonify(
                {
                    "scatter": scatter_data,
                    "columns": list(df.columns),
                    "min_date": min_date_str,
                    "max_date": max_date_str,
                    "count": len(scatter_data),
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500
