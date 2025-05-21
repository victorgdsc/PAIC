import os
import time
from werkzeug.utils import secure_filename
from flask import current_app


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
    import pandas as pd

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
