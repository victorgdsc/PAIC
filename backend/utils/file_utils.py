import os
import time
from werkzeug.utils import secure_filename
from flask import current_app
from google.cloud import storage
from io import BytesIO
import pandas as pd
import google.auth

BUCKET_NAME = "paic-uploads-3711168007"



def get_storage_client():
    credentials, project = google.auth.default()
    return storage.Client(credentials=credentials, project=project)

def get_bucket():
    client = get_storage_client()
    return client.bucket(BUCKET_NAME)

def upload_bytes_to_gcs(content, blob_name):
    bucket = get_bucket()
    blob = bucket.blob(blob_name)
    blob.upload_from_string(content)

def upload_file_to_gcs(local_file_path, blob_name):
    bucket = get_bucket()
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(local_file_path)

def download_blob_as_bytes(blob_name):
    bucket = get_bucket()
    blob = bucket.blob(blob_name)
    return blob.download_as_bytes()

def download_blob_as_text(blob_name):
    bucket = get_bucket()
    blob = bucket.blob(blob_name)
    return blob.download_as_text()

def blob_exists(blob_name):
    bucket = get_bucket()
    blob = bucket.blob(blob_name)
    return blob.exists(get_storage_client())

def read_csv_from_gcs(blob_name, **kwargs):
    content = download_blob_as_bytes(blob_name)
    return pd.read_csv(BytesIO(content), **kwargs)

def read_parquet_from_gcs(blob_name):
    content = download_blob_as_bytes(blob_name)
    return pd.read_parquet(BytesIO(content))

def save_parquet_to_gcs(df, blob_name):
    buffer = BytesIO()
    df.to_parquet(buffer, index=False)
    upload_bytes_to_gcs(buffer.getvalue(), blob_name)


def allowed_file(filename: str) -> bool:
    allowed_extensions = current_app.config.get("ALLOWED_EXTENSIONS", {"csv"})
    return filename.lower().endswith(tuple(allowed_extensions))


def save_uploaded_file(file_storage, file_id: str):
    try:
        upload_folder = current_app.config["UPLOAD_FOLDER"]
        os.makedirs(upload_folder, exist_ok=True)
        file_path = os.path.join(upload_folder, file_id)
        with open(file_path, "wb") as f:
            f.write(file_storage.read())
        return file_path, None
    except Exception as e:
        return "", str(e)


def get_processed_file_path(file_id):
    return os.path.join(
        current_app.config["PROCESSED_FOLDER"], f"{secure_filename(file_id)}.parquet"
    )


def save_processed_dataframe(df, file_id: str):
    try:
        processed_file_path = get_processed_file_path(file_id)
        os.makedirs(os.path.dirname(processed_file_path), exist_ok=True)
        df.to_parquet(processed_file_path, index=False)
        return processed_file_path, None
    except Exception as e:
        return "", str(e)


def load_processed_dataframe(file_id: str):

    try:
        processed_file_path = get_processed_file_path(file_id)
        if not os.path.exists(processed_file_path):
            return pd.DataFrame(), "Arquivo processado não encontrado."
        df = pd.read_parquet(processed_file_path)
        return df, None
    except Exception as e:
        return pd.DataFrame(), str(e)


def clean_old_files(max_age_seconds=3600):
    now = time.time()
    folders = [
        current_app.config.get("UPLOAD_FOLDER"),
        current_app.config.get("PROCESSED_FOLDER")
    ]
    for folder in folders:
        if not folder or not os.path.exists(folder):
            continue
        for filename in os.listdir(folder):
            file_path = os.path.join(folder, filename)
            if os.path.isfile(file_path):
                mtime = os.path.getmtime(file_path)
                if now - mtime > max_age_seconds:
                    try:
                        os.remove(file_path)
                    except Exception:
                        pass
