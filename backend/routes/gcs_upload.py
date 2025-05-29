from flask import Blueprint, request, jsonify
from google.cloud import storage
from datetime import timedelta
import os
from flask_cors import CORS, cross_origin

upload_bp = Blueprint("upload", __name__, url_prefix="/api")
CORS(upload_bp)

@upload_bp.route('/generate-upload-url', methods=['POST'])
def generate_upload_url():
    data = request.get_json()
    file_name = data.get('file_name')
    if not file_name:
        return jsonify({'error': 'Nome do arquivo é obrigatório'}), 400

    bucket_name = os.environ.get('GCS_BUCKET', 'SEU_BUCKET_AQUI')
    from google.cloud import storage
    from google.auth import default
    from google.auth.transport.requests import Request
    from datetime import datetime, timedelta

    credentials, project = default()

    if not credentials.token:
        auth_request = Request()
        credentials.refresh(auth_request)

    client = storage.Client(project=project, credentials=credentials)
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(f'uploads/{file_name}')

    expiration = datetime.utcnow() + timedelta(minutes=15)

    url = blob.generate_signed_url(
        version="v4",
        expiration=expiration,
        method="PUT",
        content_type="application/octet-stream",
        service_account_email=credentials.service_account_email,
        access_token=credentials.token
    )

    return jsonify({'url': url})


@upload_bp.route('/notify-upload-complete', methods=['POST'])
def notify_upload_complete():
    data = request.get_json()
    file_name = data.get('file_name')
    print(f"[notify_upload_complete] file_name recebido: {file_name}")
    if not file_name:
        print("[notify_upload_complete] Nome do arquivo não informado!")
        return jsonify({'error': 'Nome do arquivo é obrigatório'}), 400
    bucket_name = os.environ.get('GCS_BUCKET', 'SEU_BUCKET_AQUI')
    print(f"[notify_upload_complete] bucket_name: {bucket_name}")
    from utils.file_utils import get_storage_client
    storage_client = get_storage_client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(file_name)
    print(f"[notify_upload_complete] Checando se blob existe: {file_name}")
    if not blob.exists():
        print(f"[notify_upload_complete] Arquivo {file_name} não encontrado no bucket {bucket_name}!")
        return jsonify({'error': 'Arquivo não encontrado no bucket.'}), 404

    import io
    import pandas as pd
    try:
        print(f"[notify_upload_complete] Tentando baixar e ler o header do arquivo {file_name}")
        data_bytes = blob.download_as_bytes()
        df = pd.read_csv(io.BytesIO(data_bytes), nrows=0)
        columns = df.columns.tolist()
        print(f"[notify_upload_complete] Colunas lidas: {columns}")
    except Exception as e:
        print(f"[notify_upload_complete] ERRO ao ler header do arquivo {file_name}: {e}")
        columns = []

    return jsonify({'message': f'Arquivo {file_name} pronto para processamento.', 'columns': columns}), 200


@upload_bp.route('/copy-sample-in-gcs', methods=['POST', 'OPTIONS'])
@cross_origin()
def copy_sample_in_gcs():
    if request.method == 'OPTIONS':
        return '', 204

    data = request.get_json()
    sample_blob_name = data.get('sample_blob_name')
    dest_blob_name = data.get('dest_blob_name')
    if not sample_blob_name or not dest_blob_name:
        return jsonify({'error': 'sample_blob_name e dest_blob_name são obrigatórios'}), 400

    bucket_name = os.environ.get('GCS_BUCKET', 'SEU_BUCKET_AQUI')
    from utils.file_utils import get_storage_client
    storage_client = get_storage_client()
    bucket = storage_client.bucket(bucket_name)

    sample_blob = bucket.blob(sample_blob_name)
    if not sample_blob.exists():
        return jsonify({'error': f'O arquivo sample {sample_blob_name} não existe no bucket.'}), 404

    new_blob = bucket.copy_blob(sample_blob, bucket, dest_blob_name)

    import io
    import pandas as pd
    blob = bucket.blob(dest_blob_name)
    data = blob.download_as_bytes()
    try:
        df = pd.read_csv(io.BytesIO(data), nrows=0)
        columns = df.columns.tolist()
    except Exception as e:
        columns = []

    return jsonify({'message': 'Arquivo copiado com sucesso!', 'new_blob_name': new_blob.name, 'columns': columns}), 200
