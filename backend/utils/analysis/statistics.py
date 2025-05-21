import pandas as pd
from typing import Dict, Any, Optional, Tuple


def calculate_delay_statistics(
    df: pd.DataFrame,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    if "delay_days" not in df.columns:
        return None, "Coluna de atraso ('delay_days') não encontrada."

    delay_series = pd.to_numeric(df["delay_days"], errors="coerce").dropna()
    if delay_series.empty:
        return None, "Coluna de atraso ('delay_days') não possui dados válidos."

    stats = {
        "mediaAtraso": float(delay_series.mean()),
        "medianaAtraso": float(delay_series.median()),
        "minAtraso": float(delay_series.min()),
        "maxAtraso": float(delay_series.max()),
        "desvioPadraoAtraso": float(delay_series.std()),
        "totalLinhasComAtraso": int(delay_series.count()),
        "totalLinhasSemAtraso": int(df["delay_days"].isnull().sum()),
    }

    return stats, None
