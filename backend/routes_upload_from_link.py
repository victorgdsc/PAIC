from flask import Blueprint, request, jsonify, current_app
import requests
import os
from werkzeug.utils import secure_filename
from config import UPLOAD_FOLDER, ALLOWED_EXTENSIONS

bp = Blueprint('upload_from_link', __name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@bp.route('/api/upload-from-link', methods=['POST'])
def upload_from_link():
    data = request.json
    file_url = data.get('url')
    if not file_url:
        return jsonify({"error": "No URL provided"}), 400
    try:
        response = requests.get(file_url)
        if response.status_code != 200:
            return jsonify({"error": "Failed to download file"}), 400

        import uuid
        original_filename = file_url.split('id=')[-1] + '.csv'
        filename = f"{uuid.uuid4()}_{secure_filename(original_filename)}"
        upload_folder = current_app.config["UPLOAD_FOLDER"]
        file_path = os.path.join(upload_folder, filename)
        os.makedirs(upload_folder, exist_ok=True)
        with open(file_path, 'wb') as f:
            f.write(response.content)

        from utils.csv_parser import parse_csv
        from utils.data_prep import infer_column_types
        with open(file_path, 'rb') as f:
            file_content = f.read()
        try:
            chunks = list(parse_csv(file_content))
            data_sample = chunks[0] if chunks else []
        except Exception as e:
            return jsonify({"error": f"Erro ao processar CSV: {str(e)}"}), 500
        columns = infer_column_types(data_sample) if data_sample else []
        return jsonify({
            "message": "Arquivo baixado e salvo com sucesso",
            "filename": filename,
            "fileId": filename,
            "columns": columns,
            "data": data_sample
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
