from flask import Blueprint, request, jsonify
from utils.file_utils import read_csv_from_gcs

columns_bp = Blueprint("columns", __name__, url_prefix="/api")

@columns_bp.route("/get-columns", methods=["POST"])
def get_columns():
    data = request.json
    file_id = data.get("fileId")
    if not file_id:
        return jsonify({"error": "fileId não fornecido"}), 400
    if not (file_id.startswith("uploads/") or file_id.startswith("samples/")):
        file_id = f"uploads/{file_id}"
    try:
        df = read_csv_from_gcs(file_id, nrows=1)
        columns = list(df.columns)
        return jsonify({"columns": columns})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
