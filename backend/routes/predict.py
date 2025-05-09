from flask import Blueprint, request, jsonify
import pandas as pd
from utils.predictor import predict_delay
from utils.file_utils import load_processed_dataframe

predict_bp = Blueprint("predict", __name__, url_prefix="/api")


@predict_bp.route("/predict", methods=["POST"])
def predict_route():
    try:
        payload = request.json
        if not payload:
            return jsonify({"error": "Dados não fornecidos"}), 400

        query = payload.get("query")
        columns_info = payload.get("columns")
        file_id = payload.get("fileId")

        if not query or not columns_info or not file_id:
            return (
                jsonify(
                    {
                        "error": "Payload incompleto: query, informações das colunas ou fileId ausentes"
                    }
                ),
                400,
            )

        df_processed, load_error = load_processed_dataframe(file_id)
        if load_error:
            status_code = 404 if "não encontrado" in load_error else 500
            return jsonify({"error": load_error}), status_code

        query_cols = list(query.keys())
        base_cols = set(df_processed.columns)
        missing_cols = [
            col
            for col in query_cols
            if not (
                col in base_cols
                or (col.endswith("_min") and col[:-4] in base_cols)
                or (col.endswith("_max") and col[:-4] in base_cols)
            )
        ]
        if missing_cols:
            return (
                jsonify(
                    {
                        "error": f"Colunas da consulta ({', '.join(missing_cols)}) não encontradas nos dados processados."
                    }
                ),
                400,
            )

        prediction_results = predict_delay(df_processed, query, columns_info)

        if isinstance(prediction_results, dict) and "error" in prediction_results:
            return jsonify({"error": prediction_results["error"]}), 400

        return jsonify(prediction_results)

    except Exception as e:
        return (
            jsonify({"error": f"Erro interno do servidor na rota /predict: {str(e)}"}),
            500,
        )
