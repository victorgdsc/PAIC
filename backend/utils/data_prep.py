import pandas as pd
from typing import List, Dict, Any


def infer_column_types(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not data:
        return []

    sample_row = data[0]
    columns = []

    for key, value in sample_row.items():
        col_type = "string"

        if isinstance(value, (int, float)):
            col_type = (
                "string" if "id" in key.lower() or len(str(value)) > 10 else "number"
            )
        elif isinstance(value, bool):
            col_type = "boolean"
        elif isinstance(value, str):
            col_type = "string"

        columns.append(
            {
                "name": key,
                "label": key.replace("_", " ").replace(".", " ").title(),
                "type": col_type,
                "selected": False,
            }
        )

    return columns


def prepare_data(
    dataset: List[Dict[str, Any]], columns_info: List[Dict[str, Any]]
) -> pd.DataFrame:
    if not dataset:
        return pd.DataFrame()

    df = pd.DataFrame(dataset)
    rename_map = {}
    date_cols_to_convert = []
    factor_cols_original = []

    for col_info in columns_info:
        original_name = col_info.get("name")
        role = col_info.get("role")

        if not original_name or original_name not in df.columns:
            continue

        if role == "estimatedDate":
            target_name = "estimated_date"
            rename_map[original_name] = target_name
            date_cols_to_convert.append(target_name)
        elif role == "actualDate":
            target_name = "actual_date"
            rename_map[original_name] = target_name
            date_cols_to_convert.append(target_name)
        elif role == "delay":
            target_name = "delay_days"
            rename_map[original_name] = target_name
        elif role == "factor":
            factor_cols_original.append(original_name)

    if rename_map:
        df.rename(columns=rename_map, inplace=True)

    for col_name in date_cols_to_convert:
        if col_name in df.columns:
            df[col_name] = pd.to_datetime(
                df[col_name], errors="coerce", infer_datetime_format=True, dayfirst=None
            )

    if (
        "delay_days" not in df.columns
        and "estimated_date" in df.columns
        and "actual_date" in df.columns
    ):
        if pd.api.types.is_datetime64_any_dtype(
            df["actual_date"]
        ) and pd.api.types.is_datetime64_any_dtype(df["estimated_date"]):
            mask = df["actual_date"].notna() & df["estimated_date"].notna()
            df.loc[mask, "delay_days"] = (
                df.loc[mask, "actual_date"] - df.loc[mask, "estimated_date"]
            ).dt.days

    if "delay_days" in df.columns:
        df["delay_days"] = pd.to_numeric(df["delay_days"], errors="coerce")

    factor_cols_target = [rename_map.get(f, f) for f in factor_cols_original]
    for col_name in factor_cols_target:
        if col_name in df.columns:
            col_info = next(
                (
                    c
                    for c in columns_info
                    if c.get("name") == col_name
                    or rename_map.get(c.get("name")) == col_name
                ),
                None,
            )

            if col_info and col_info.get("isNumeric"):
                try:
                    df[col_name] = pd.to_numeric(df[col_name], errors="coerce")
                    if (df[col_name].dropna() % 1 == 0).all():
                        df[col_name] = df[col_name].astype("Int64")
                except Exception:
                    df[col_name] = df[col_name].astype(str)
            else:
                df[col_name] = df[col_name].astype(str)

    final_columns = list(rename_map.values())
    final_columns.extend([f for f in factor_cols_original if f not in rename_map])
    if "delay_days" in df.columns and "delay_days" not in final_columns:
        final_columns.append("delay_days")
    final_columns = [col for col in final_columns if col in df.columns]

    return df[final_columns]
