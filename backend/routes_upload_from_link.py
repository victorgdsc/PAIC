from flask import Blueprint, request, jsonify
import requests
import uuid
import os
from google.cloud import storage

bp = Blueprint('upload_from_link', __name__)

def upload_to_gcs(file_content, destination_blob_name):
    """Uploads a file to Google Cloud Storage."""
    storage_client = storage.Client()
    bucket = storage_client.bucket('paic-uploads-3711168007')
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_string(file_content)
    return f"https://storage.googleapis.com/{bucket.name}/{blob.name}"

from utils.csv_parser import parse_csv
from utils.data_prep import infer_column_types

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

        file_content = response.content
        file_extension = os.path.splitext(file_url)[1] or '.csv'
        filename = f"uploads/{uuid.uuid4()}{file_extension}"

        try:
            chunk_gen = parse_csv(file_content, chunk_size=500)
            data_sample = next(chunk_gen, [])
        except Exception as e:
            return jsonify({"error": f"Erro ao processar CSV: {str(e)}"}), 500
        columns = infer_column_types(data_sample) if data_sample else []

        file_url_gcs = upload_to_gcs(file_content, filename)

        return jsonify({
            "message": "Arquivo salvo com sucesso",
            "fileUrl": file_url_gcs,
            "columns": columns,
            "data": data_sample
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
