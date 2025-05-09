import os
from pathlib import Path

BASE_DIR = Path(__file__).parent
UPLOAD_FOLDER = BASE_DIR / "temp_files"
PROCESSED_FOLDER = BASE_DIR / "processed_data"

ALLOWED_EXTENSIONS = {"csv", "xlsx", "xls"}
MAX_FILE_SIZE = 10 * 1024 * 1024

CORS_ORIGINS = [os.environ.get("FRONTEND_URL")]

CORS_ALLOW_HEADERS = ["Content-Type", "Authorization"]
CORS_METHODS = ["GET", "POST", "OPTIONS"]
CORS_SUPPORTS_CREDENTIALS = True

DEBUG = True
TESTING = False
