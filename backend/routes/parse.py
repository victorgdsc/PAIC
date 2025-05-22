from flask import Blueprint, request, jsonify
import pandas as pd
import uuid
from werkzeug.utils import secure_filename
from utils.csv_parser import parse_csv
from utils.data_prep import infer_column_types
from utils.file_utils import allowed_file, save_uploaded_file

parse_bp = Blueprint("parse", __name__, url_prefix="/api")


@parse_bp.route("/parseFile", methods=["POST"])
def parse_file_route():
    from utils.file_utils import clean_old_files
    clean_old_files()
    try:
        if "file" not in request.files:
            return jsonify({"error": "Nenhum arquivo enviado"}), 400

        file = request.files["file"]
        if not file.filename:
            return jsonify({"error": "Nome de arquivo vazio"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "Tipo de arquivo não permitido"}), 400

        file_id = f"{uuid.uuid4()}_{secure_filename(file.filename)}"
        file_content_bytes = file.read()
        file.seek(0)
        saved_path, save_error = save_uploaded_file(file, file_id)
        if save_error:
            return jsonify({"error": save_error}), 500

        try:
            data_chunks = parse_csv(file_content_bytes)
            first_chunk = next(data_chunks)

            if not isinstance(first_chunk, list):
                raise TypeError("Parsed data chunk is not a list.")

            cleaned_first_chunk = []
            if isinstance(first_chunk, list):
                for row in first_chunk[:10]:
                    cleaned_row = (
                        {
                            key: (None if pd.isna(value) else value)
                            for key, value in row.items()
                        }
                        if isinstance(row, dict)
                        else row
                    )
                    cleaned_first_chunk.append(cleaned_row)
            else:
                cleaned_first_chunk = first_chunk

            columns = infer_column_types(first_chunk)

            if not isinstance(columns, list):
                raise TypeError("Inferred columns result is not a list.")

            response_data = {
                "columns": columns,
                "data": cleaned_first_chunk,
                "chunked": len(file_content_bytes) > 10 * 1024 * 1024,
                "fileId": file_id,
            }
            return jsonify(response_data)

        except StopIteration:
            return (
                jsonify({"error": "Arquivo CSV vazio ou contém apenas cabeçalho"}),
                400,
            )
        except Exception as e:
            return jsonify({"error": f"Erro ao processar arquivo: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500