import os
from pathlib import Path

BASE_DIR = Path(__file__).parent
UPLOAD_FOLDER = BASE_DIR / "temp_files"
PROCESSED_FOLDER = BASE_DIR / "processed_data"

ALLOWED_EXTENSIONS = {"csv", "xlsx", "xls"}
MAX_FILE_SIZE = 100 * 1024 * 1024

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:8080")
if "," in CORS_ORIGINS:
    CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS.split(",")]
CORS_ALLOW_HEADERS = ["Content-Type", "Authorization"]
CORS_METHODS = ["GET", "POST", "OPTIONS"]
CORS_SUPPORTS_CREDENTIALS = True

DEBUG = True
TESTING = False
