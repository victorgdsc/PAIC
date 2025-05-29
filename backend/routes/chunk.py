from flask import Blueprint, jsonify, request
from utils.file_utils import read_csv_from_gcs, read_parquet_from_gcs, blob_exists
import pandas as pd

chunk_bp = Blueprint("chunk", __name__, url_prefix="/api")

@chunk_bp.route("/getChunk/<file_id>/<int:chunk_index>", methods=["GET"])
def get_chunk(file_id, chunk_index):
    try:
        blob_name_parquet = f"processed/{file_id}.parquet"
        blob_name_csv = f"uploads/{file_id}.csv"
        if blob_exists(blob_name_parquet):
            df = read_parquet_from_gcs(blob_name_parquet)
        elif blob_exists(blob_name_csv):
            df = read_csv_from_gcs(blob_name_csv)
        else:
            return jsonify({"error": "Arquivo não encontrado"}), 404

        chunk_size = 10000
        total_rows = len(df)
        total_chunks = (total_rows + chunk_size - 1) // chunk_size

        if chunk_index >= total_chunks:
            return jsonify({"error": "Chunk não encontrado"}), 404

        start = chunk_index * chunk_size
        end = min(start + chunk_size, total_rows)
        data_chunk = df.iloc[start:end].to_dict(orient="records")
        has_more = (chunk_index + 1) < total_chunks
        return jsonify({"data": data_chunk, "hasMore": has_more})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
