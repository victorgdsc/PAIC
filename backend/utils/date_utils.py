from dateutil import parser
from datetime import datetime
from typing import Optional
import re


def parse_date(date_str: str) -> Optional[datetime]:
    if not re.search(r"\d{1,2}[./-]\d{1,2}[./-]\d{2,4}", date_str):
        return None
    try:
        return parser.parse(date_str, dayfirst=True)
    except Exception:
        return None


def calculate_delay(estimated: datetime, actual: datetime) -> Optional[int]:
    try:
        return (actual - estimated).days
    except Exception:
        return None
