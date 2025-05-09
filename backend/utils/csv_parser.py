import pandas as pd
import io
import re
import csv
from typing import List, Dict, Any, Generator
import chardet


def detect_encoding(file_content: bytes) -> str:
    result = chardet.detect(file_content)
    return result["encoding"] or "utf-8"


def detect_delimiter(sample: str) -> str:
    try:
        dialect = csv.Sniffer().sniff(sample)
        return dialect.delimiter
    except:
        delimiters = [",", ";", "\t", "|"]
        scores = {d: sample.count(d) for d in delimiters}
        return max(scores, key=scores.get)


def process_chunk(chunk: pd.DataFrame) -> List[Dict[str, Any]]:
    for col in chunk.select_dtypes(include=["float64"]).columns:
        chunk[col] = chunk[col].astype("float32")
    for col in chunk.select_dtypes(include=["int64"]).columns:
        chunk[col] = chunk[col].astype("int32")
    for col in chunk.select_dtypes(include=["datetime64"]).columns:
        chunk[col] = chunk[col].dt.strftime("%Y-%m-%d")

    records = chunk.to_dict("records")
    for record in records:
        for key, value in record.items():
            if pd.isna(value):
                record[key] = None
            elif isinstance(value, (pd.Timestamp, pd.Timedelta)):
                record[key] = str(value)
    return records


def parse_csv(
    file_content: bytes, chunk_size: int = 10000
) -> Generator[List[Dict[str, Any]], None, None]:
    encoding = detect_encoding(file_content)

    try:
        content = file_content.decode(encoding)
    except UnicodeDecodeError:
        content = file_content.decode("utf-8", errors="replace")

    content = content.strip().lstrip("\ufeff")
    if not content:
        raise ValueError("Arquivo CSV vazio")

    lines = re.split(r"\r\n|\r|\n", content)
    lines = [line for line in lines if line.strip()]

    if len(lines) <= 1:
        raise ValueError("CSV contém apenas o cabeçalho ou está mal formatado")

    delimiter = detect_delimiter(lines[0])

    try:
        csv_io = io.StringIO(content, newline=None)
        reader = pd.read_csv(
            csv_io,
            delimiter=delimiter,
            encoding=encoding,
            engine="python",
            on_bad_lines="warn",
            chunksize=chunk_size,
        )
        for chunk in reader:
            records = process_chunk(chunk)
            yield records

    except Exception as e:
        raise ValueError(f"Erro ao ler CSV: {str(e)}")
