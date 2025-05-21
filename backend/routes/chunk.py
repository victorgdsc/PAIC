from flask import Blueprint, jsonify, current_app
import os
import pandas as pd
from utils.file_utils import get_processed_file_path
from config import UPLOAD_FOLDER
import io

chunk_bp = Blueprint("chunk", __name__, url_prefix="/api")

@chunk_bp.route("/getChunk/<file_id>/<int:chunk_index>", methods=["GET"])
def get_chunk(file_id, chunk_index):
    try:
        
        upload_folder = current_app.config.get("UPLOAD_FOLDER", UPLOAD_FOLDER)
        file_path = os.path.join(upload_folder, file_id)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "Arquivo não encontrado"}), 404
        
        
        chunk_size = 10000  
        
        try:
            
            total_rows = sum(1 for _ in open(file_path, 'r', encoding='utf-8')) - 1  
            total_chunks = (total_rows + chunk_size - 1) // chunk_size  
            
            
            if chunk_index >= total_chunks:
                return jsonify({"data": [], "hasMore": False})
            
            
            skip_rows = chunk_index * chunk_size + 1  
            
            
            data_chunk = pd.read_csv(
                file_path,
                skiprows=range(1, skip_rows),  
                nrows=chunk_size,
                low_memory=False
            )
            
            
            has_more = (chunk_index + 1) < total_chunks
            
            
            result = {
                "data": data_chunk.to_dict(orient="records"),
                "hasMore": has_more
            }
            
            return jsonify(result)
            
        except Exception as e:
            return jsonify({"error": f"Erro ao processar chunk: {str(e)}"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
