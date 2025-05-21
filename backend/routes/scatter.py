from flask import Blueprint, request, jsonify
import pandas as pd
import os
from utils.file_utils import load_processed_dataframe
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


@scatter_bp.route("/scatter-data", methods=["POST"])
def scatter_data_route():
    try:
        payload = request.json
        file_id = payload.get("fileId")
        fator = payload.get("fator")
        fator_valor = payload.get("fatorValor")
        data_inicio = payload.get("dataInicio")
        data_fim = payload.get("dataFim")
        limit = int(payload.get("limit", 1000))

        if not file_id:
            return jsonify({"error": "fileId não fornecido"}), 400

        df, load_error = load_processed_dataframe(file_id)
        if load_error or df is None:
            return jsonify({"error": f"Erro ao carregar dados: {load_error}"}), 500

        if data_inicio:
            df = df[df["actual_date"] >= data_inicio]
        if data_fim:
            df = df[df["actual_date"] <= data_fim]

        if fator and fator in df.columns:
            if fator_valor is not None and fator_valor != "ALL":
                df = df[df[fator] == fator_valor]
            scatter_data = (
                df[
                    ["actual_date", "estimated_date", "delay_days"]
                    + [
                        col
                        for col in df.columns
                        if col not in ["actual_date", "estimated_date", "delay_days"]
                    ]
                ]
                .dropna(subset=["actual_date", "delay_days"])
                .to_dict(orient="records")
            )
        else:
            scatter_data = (
                df[
                    ["actual_date", "estimated_date", "delay_days"]
                    + [
                        col
                        for col in df.columns
                        if col not in ["actual_date", "estimated_date", "delay_days"]
                    ]
                ]
                .dropna(subset=["actual_date", "delay_days"])
                .to_dict(orient="records")
            )

        if len(scatter_data) > limit:
            scatter_data = random.sample(scatter_data, limit)

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
