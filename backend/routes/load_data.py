from flask import Blueprint, request, jsonify, current_app
import os
import pandas as pd
from utils.csv_parser import parse_csv

load_data_bp = Blueprint("load_data", __name__, url_prefix="/api")


@load_data_bp.route("/loadData", methods=["POST"])
def load_data_route():
    try:
        data = request.json
        file_id = data.get("fileId")

        if not file_id:
            return jsonify({"error": "fileId não fornecido"}), 400

        file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], file_id)

        if not os.path.exists(file_path):
            return jsonify({"error": "Arquivo não encontrado no servidor"}), 404

        try:
            with open(file_path, "rb") as f:
                file_content = f.read()
            all_data = []
            data_generator = parse_csv(file_content)
            for chunk in data_generator:
                all_data.extend(chunk)
            cleaned_data = []
            for row in all_data:
                cleaned_row = {
                    key: (None if pd.isna(value) else value)
                    for key, value in row.items()
                }
                cleaned_data.append(cleaned_row)
            return jsonify({"data": cleaned_data})
        except Exception as e:
            return (
                jsonify({"error": f"Erro ao processar dados do arquivo: {str(e)}"}),
                500,
            )

    except Exception as e:
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
