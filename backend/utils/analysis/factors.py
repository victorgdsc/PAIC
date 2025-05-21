import pandas as pd
from typing import Dict, Any, Optional, List

RESERVED_COLS = ["estimated_date", "actual_date", "delay_days"]


def _perform_single_factor_analysis(
    df: pd.DataFrame, factor_col: str, avg_delay_overall: float
) -> Optional[Dict[str, Any]]:

    if factor_col not in df.columns or df[factor_col].isnull().all():

        return None

    is_numeric = pd.api.types.is_numeric_dtype(df[factor_col])
    unique_count = df[factor_col].nunique()

    if not is_numeric and (unique_count > 50 or unique_count < 2):

        return None

    factor_values_data: List[Dict[str, Any]] = []
    try:
        grouped = df.groupby(factor_col)["delay_days"]

        for value, group in grouped:
            if pd.notna(value):
                delay_series = pd.to_numeric(group, errors="coerce").dropna()
                if not delay_series.empty:
                    count_with_delay = int(delay_series.count())
                    avg_delay_group = float(delay_series.mean())
                    percent_diff = (
                        ((avg_delay_group / avg_delay_overall) - 1) * 100
                        if avg_delay_overall != 0
                        else 0
                    )

                    display_value = value
                    if is_numeric and not isinstance(value, str):
                        display_value = round(float(value), 2)

                    factor_values_data.append(
                        {
                            "valor": str(display_value),
                            "quantidade": count_with_delay,
                            "mediaAtraso": round(avg_delay_group, 2),
                            "diferencaPercentual": round(percent_diff, 2),
                            "tipo": "numerico" if is_numeric else "categorico",
                        }
                    )

        factor_values_data.sort(key=lambda x: x["quantidade"], reverse=True)

        if factor_values_data:
            return {
                "fator": factor_col,
                "valores": factor_values_data[:100],
                "tipo": "numerico" if is_numeric else "categorico",
            }
    except Exception as e:

        return None


def perform_factor_analysis(
    df: pd.DataFrame, delay_stats: Optional[Dict[str, float]]
) -> List[Dict[str, Any]]:

    factor_analysis_output = []
    if (
        not delay_stats
        or "mediaAtraso" not in delay_stats
        or delay_stats["mediaAtraso"] is None
    ):

        return factor_analysis_output

    avg_delay_overall = delay_stats["mediaAtraso"]
    potential_factors = []
    df_modified = df.copy()

    for col in df_modified.columns:
        if col in RESERVED_COLS:
            continue

        is_numeric = pd.api.types.is_numeric_dtype(df_modified[col]) and col not in [
            "delay_days"
        ]
        is_text = df_modified[col].dtype in ["object", "string", "category"]
        if is_numeric:
            if df_modified[col].nunique() > 10:
                try:
                    df_modified[f"{col}_category"] = pd.qcut(
                        df_modified[col], q=5, duplicates="drop"
                    ).astype(str)
                    potential_factors.append(f"{col}_category")
                except Exception as e:

                    df_modified[col] = df_modified[col].astype(str)
                    potential_factors.append(col)
            else:
                df_modified[col] = df_modified[col].astype(str)
                potential_factors.append(col)
        elif is_text:
            potential_factors.append(col)

    for col in potential_factors:
        if col in df_modified.columns:
            factor_result = _perform_single_factor_analysis(
                df_modified, col, avg_delay_overall
            )
            if factor_result:
                factor_analysis_output.append(factor_result)

    return factor_analysis_output
