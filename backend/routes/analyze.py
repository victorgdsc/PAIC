from flask import Blueprint, request, jsonify, current_app
from utils.data_prep import prepare_data
from utils.analyzer import analyze_data
from utils.file_utils import save_processed_dataframe

analyze_bp = Blueprint("analyze", __name__, url_prefix="/api")


@analyze_bp.route("/analyze", methods=["POST"])
def analyze_route():
    try:
        payload = request.json
        if not payload:
            return jsonify({"error": "Dados não fornecidos"}), 400

        columns_info = payload.get("columns")
        file_id = payload.get("fileId")
        model_type = payload.get("modelType")

        if not columns_info or not file_id:
            return jsonify({"error": "Payload incompleto: informações das colunas ou fileId ausentes"}), 400


        import os
        import pandas as pd
        UPLOAD_FOLDER = current_app.config["UPLOAD_FOLDER"]
        file_path = os.path.join(UPLOAD_FOLDER, file_id)
        df = pd.read_csv(file_path)

        try:

            df_prepared = prepare_data(df, columns_info)


            save_processed_dataframe(df_prepared, file_id)


            if df_prepared.empty:
                return jsonify({"error": "Nenhum dado disponível para análise após o processamento"}), 400

            _, save_error = save_processed_dataframe(df_prepared, file_id)
            if save_error:
                return jsonify({"error": save_error}), 500

        except Exception as e:
            return (
                jsonify(
                    {"error": f"Erro na preparação dos dados para análise: {str(e)}"}
                ),
                500,
            )

        try:
            analysis_results = analyze_data(df_prepared)
            if isinstance(analysis_results, dict) and "error" in analysis_results:
                return jsonify({"error": analysis_results["error"]}), 500
                
            
            if isinstance(analysis_results, dict):
                analysis_results["success"] = True
                
            return jsonify(analysis_results)
            
        except Exception as e:
            return jsonify({"error": f"Erro na análise dos dados: {str(e)}"}), 500

    except Exception as e:
        return (
            jsonify({"error": f"Erro interno do servidor na rota /analyze: {str(e)}"}),
            500,
        )