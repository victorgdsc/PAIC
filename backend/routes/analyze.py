from flask import Blueprint, request, jsonify
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

        dataset = payload.get("dataset")
        columns_info = payload.get("columns")
        file_id = payload.get("fileId")

        if not dataset or not columns_info or not file_id:
            return (
                jsonify(
                    {
                        "error": "Payload incompleto: dataset, informações das colunas ou fileId ausentes"
                    }
                ),
                400,
            )

        try:
            df_prepared = prepare_data(dataset, columns_info)
            if df_prepared.empty:
                return (
                    jsonify(
                        {"error": "Nenhum dado válido encontrado após a preparação."}
                    ),
                    400,
                )
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
            return jsonify(analysis_results)
        except Exception as e:
            return jsonify({"error": f"Erro na análise dos dados: {str(e)}"}), 500

    except Exception as e:
        return (
            jsonify({"error": f"Erro interno do servidor na rota /analyze: {str(e)}"}),
            500,
        )
        