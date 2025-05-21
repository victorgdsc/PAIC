from flask import Flask, jsonify
from flask_cors import CORS
import os
from werkzeug.exceptions import HTTPException
from config import (
    UPLOAD_FOLDER,
    PROCESSED_FOLDER,
    CORS_ORIGINS,
    CORS_ALLOW_HEADERS,
    CORS_METHODS,
    CORS_SUPPORTS_CREDENTIALS,
)

from routes.parse import parse_bp
from routes.load_data import load_data_bp
from routes.analyze import analyze_bp
from routes.forecast import forecast_bp
from routes.predict import predict_bp
from routes.scatter import scatter_bp
from routes.pareto import pareto_bp
from routes.chunk import chunk_bp

app = Flask(__name__)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["PROCESSED_FOLDER"] = PROCESSED_FOLDER

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": CORS_ORIGINS,
            "allow_headers": CORS_ALLOW_HEADERS,
            "methods": CORS_METHODS,
            "supports_credentials": CORS_SUPPORTS_CREDENTIALS,
        }
    },
)

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(app.config["PROCESSED_FOLDER"], exist_ok=True)

blueprints = [
    parse_bp,
    load_data_bp,
    analyze_bp,
    forecast_bp,
    predict_bp,
    scatter_bp,
    pareto_bp,
    chunk_bp,
]

for bp in blueprints:
    app.register_blueprint(bp)


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200


@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, HTTPException):
        return e
    return jsonify(error=f"Erro interno do servidor: {str(e)}"), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
