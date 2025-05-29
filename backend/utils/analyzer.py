import pandas as pd
from typing import Dict, Any
from .analysis import (
    calculate_delay_statistics,
    perform_factor_analysis,
    run_and_evaluate_forecasts,
    generate_insights,
)

RESERVED_COLS = ["estimated_date", "actual_date", "delay_days"]
MIN_DATA_POINTS_FOR_TIMESERIES = 15
FORECAST_PERIODS = 12


def calculate_delivery_status_counts(df: pd.DataFrame) -> dict:
    antecipadas = 0
    no_prazo = 0
    atrasadas = 0

    if "estimated_date" in df.columns and "actual_date" in df.columns:
        for _, row in df.iterrows():
            try:
                estimated = pd.to_datetime(row["estimated_date"])
                actual = pd.to_datetime(row["actual_date"])
                if actual < estimated:
                    antecipadas += 1
                elif actual == estimated:
                    no_prazo += 1
                else:
                    atrasadas += 1
            except Exception:
                continue
    total = antecipadas + no_prazo + atrasadas
    return {
        "antecipadas": antecipadas,
        "noPrazo": no_prazo,
        "atrasadas": atrasadas,
        "total": total
    }

def analyze_data(df: pd.DataFrame) -> Dict[str, Any]:
    try:
        stats, stats_err = calculate_delay_statistics(df)
        if stats_err:
            return {"error": stats_err, "delayStatistics": None}

        factors = perform_factor_analysis(df, stats)
        forecast_results = run_and_evaluate_forecasts(df)

        mapped_stats = {
            "averageDelay": stats.get("mediaAtraso"),
            "medianDelay": stats.get("medianaAtraso"),
            "minDelay": stats.get("minAtraso"),
            "maxDelay": stats.get("maxAtraso"),
        }

        mapped_factors = [
            {
                "factor": f.get("fator"),
                "values": [
                    {
                        "value": v.get("valor"),
                        "count": v.get("quantidade"),
                        "averageDelay": v.get("mediaAtraso"),
                        "percentDifference": v.get("diferencaPercentual"),
                    }
                    for v in f.get("valores", [])
                ],
            }
            for f in factors
        ]

        insights = generate_insights(
            {
                "delayStatistics": stats,
                "fatores": factors,
                "forecast": forecast_results.get("forecast", []),
            }
        )

        mapped_insights = [i.get("descricao", "") for i in insights]

        status_counts = calculate_delivery_status_counts(df)
        return {
            "delayStatistics": mapped_stats,
            "factorAnalysis": mapped_factors,
            "timeSeriesAnalysis": {
                "historical": forecast_results.get("historical", []),
                "forecast": forecast_results.get("forecast", []),
                "model_used": forecast_results.get("model_used"),
                "aic": forecast_results.get("aic"),
                "bic": forecast_results.get("bic"),
                "order": forecast_results.get("order"),
                "warning": forecast_results.get("warning"),
            },
            "insights": mapped_insights,
            "statusCounts": {
                "antecipadas": status_counts["antecipadas"],
                "noPrazo": status_counts["noPrazo"],
                "atrasadas": status_counts["atrasadas"]
            },
            "totalDeliveries": status_counts["total"]
        }

    except Exception as e:
        return {"error": str(e)}
