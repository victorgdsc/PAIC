import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tools.sm_exceptions import ConvergenceWarning, ValueWarning
from statsmodels.stats.diagnostic import acorr_ljungbox
import warnings
from typing import Dict, Any, Optional, List, Tuple
from .model_evaluation import evaluate_model_significance, evaluate_model_confidence

MIN_DATA_POINTS_FOR_TIMESERIES = 15
FORECAST_PERIODS = 12


def _prepare_time_series_data(
    df: pd.DataFrame,
) -> Tuple[Optional[pd.Series], Optional[str], List[Dict[str, Any]]]:

    historical_data = []
    if "actual_date" not in df.columns or "delay_days" not in df.columns:
        return (
            None,
            "Colunas essenciais ('actual_date', 'delay_days') não encontradas.",
            historical_data,
        )

    df_ts = df[["actual_date", "delay_days"]].copy()
    df_ts["actual_date"] = pd.to_datetime(df_ts["actual_date"], errors="coerce")
    df_ts["delay_days"] = pd.to_numeric(df_ts["delay_days"], errors="coerce")
    df_ts.dropna(subset=["actual_date", "delay_days"], inplace=True)

    if df_ts.empty:
        return (
            None,
            "Nenhum ponto de dados válido após limpeza das colunas 'actual_date' e 'delay_days'.",
            historical_data,
        )

    df_ts.sort_values("actual_date", inplace=True)
    df_ts.set_index("actual_date", inplace=True)

    try:
        df_monthly = df_ts["delay_days"].resample("ME").mean()

    except Exception as e:
        return None, f"Erro durante reamostragem mensal: {str(e)}", historical_data

    df_monthly = df_monthly.interpolate(method="linear").dropna()

    if df_monthly.empty:
        return (
            None,
            "Nenhum ponto de dados restante após agregação mensal e limpeza.",
            historical_data,
        )

    historical_data = [
        {"date": idx.strftime("%Y-%m-%d"), "value": round(val, 2)}
        for idx, val in df_monthly.items()
    ]

    if isinstance(df_monthly.index, pd.DatetimeIndex) and df_monthly.index.freq is None:
        df_monthly = df_monthly.asfreq("M", method="pad")

    return df_monthly, None, historical_data


def _generate_forecast_dates() -> pd.DatetimeIndex:

    forecast_start_date = (pd.Timestamp.now() + pd.offsets.MonthBegin(1)).normalize()
    return pd.date_range(start=forecast_start_date, periods=FORECAST_PERIODS, freq="MS")


def _run_arma_model(
    df_monthly: pd.Series, forecast_dates: pd.DatetimeIndex
) -> Dict[str, Any]:

    result = {
        "forecast": [],
        "ci_lower": [],
        "ci_upper": [],
        "error": None,
        "warning": None,
        "model_used": "ARMA",
        "aic": None,
        "bic": None,
        "quality_metrics": {},
        "order": "ARMA(1,1)",
        "pvalues": {},
    }

    if len(df_monthly) < MIN_DATA_POINTS_FOR_TIMESERIES:
        result["error"] = "Dados insuficientes"
        result["warning"] = (
            f"ARMA requer pelo menos {MIN_DATA_POINTS_FOR_TIMESERIES} pontos mensais (encontrados {len(df_monthly)})."
        )

        return result

    try:
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=ConvergenceWarning)
            warnings.filterwarnings("ignore", category=ValueWarning)
            warnings.filterwarnings("ignore", category=UserWarning)

            order = (1, 0, 1)
            model = ARIMA(df_monthly, order=order)
            model_fit = model.fit()

            result["aic"] = model_fit.aic
            result["bic"] = model_fit.bic
            result["order"] = "ARMA(1,1)"
            result["pvalues"] = model_fit.pvalues.to_dict()

            residuals = model_fit.resid
            if len(residuals) > 10:
                lb_test = acorr_ljungbox(residuals, lags=[10], return_df=True)
                lb_pvalue = lb_test["lb_pvalue"].iloc[0]
                result["quality_metrics"]["ljung_box_pvalue"] = round(lb_pvalue, 4)

                if lb_pvalue < 0.05:
                    result["warning"] = (
                        (result.get("warning") or "")
                        + " Resíduos ARMA podem ter autocorrelação (Ljung-Box p<0.05)."
                    )
            else:
                result["quality_metrics"]["ljung_box_pvalue"] = None

            fc = model_fit.get_forecast(steps=len(forecast_dates))
            forecast = fc.predicted_mean
            ci = fc.conf_int(alpha=0.05)
            result["forecast"] = forecast.tolist()
            result["ci_lower"] = ci.iloc[:, 0].tolist()
            result["ci_upper"] = ci.iloc[:, 1].tolist()
            return result

    except Exception as e:

        result["error"] = str(e)
        return result


def run_and_evaluate_forecasts(df: pd.DataFrame) -> Dict[str, Any]:

    df_monthly, error, historical_data = _prepare_time_series_data(df)
    if error:
        return {"error": error, "historical": historical_data}

    forecast_dates = _generate_forecast_dates()
    arma_result = _run_arma_model(df_monthly, forecast_dates)

    try:
        import statsmodels.api as sm

        X = sm.add_constant(np.arange(len(df_monthly)))
        glm_model = sm.GLM(df_monthly.values, X, family=sm.families.Gaussian()).fit()

        Xf = sm.add_constant(
            np.arange(len(df_monthly), len(df_monthly) + len(forecast_dates))
        )
        pred = glm_model.get_prediction(Xf)
        glm_forecast = pred.predicted_mean.tolist()
        ci_glm = pred.conf_int(alpha=0.05)
        glm_ci_lower = ci_glm.iloc[:, 0].tolist()
        glm_ci_upper = ci_glm.iloc[:, 1].tolist()
        glm_result = {
            "forecast": glm_forecast,
            "ci_lower": glm_ci_lower,
            "ci_upper": glm_ci_upper,
            "model_used": "GLM",
            "aic": getattr(glm_model, "aic", None),
            "warning": None,
        }
    except Exception:
        glm_result = {
            "forecast": [],
            "ci_lower": [],
            "ci_upper": [],
            "model_used": "GLM",
            "aic": None,
            "warning": "Fallback GLM falhou",
        }

    if arma_result.get("error"):
        best = glm_result
    else:
        arma_p = arma_result.get("quality_metrics", {}).get("ljung_box_pvalue")

        if arma_p is not None and arma_p < 0.05:
            best = glm_result
        else:
            best = arma_result
            if glm_result.get("aic") is not None and (
                arma_result.get("aic") is None or glm_result["aic"] < arma_result["aic"]
            ):
                best = glm_result

    if len(best["forecast"]) == len(forecast_dates):
        forecast_out = [
            {
                "date": date.strftime("%Y-%m-%d"),
                "value": float(best["forecast"][i]),
                "confidence_lower": float(best["ci_lower"][i]),
                "confidence_upper": float(best["ci_upper"][i]),
            }
            for i, date in enumerate(forecast_dates)
        ]
    else:
        forecast_out = []

    pvals = best.get("pvalues", {})
    if pvals:

        if best.get("model_used") == "ARMA":
            significant, significance_desc, pvals = evaluate_model_significance(pvals)
        else:

            try:
                X = sm.add_constant(np.arange(len(df_monthly)))
                glm_model = sm.GLM(
                    df_monthly.values, X, family=sm.families.Gaussian()
                ).fit()
                pvals = glm_model.pvalues.to_dict()
                significant, significance_desc, pvals = evaluate_model_significance(
                    pvals
                )
            except Exception as e:

                significant = False
                significance_desc = (
                    "Não foi possível calcular p-valores para o modelo GLM."
                )
                pvals = {}
    else:
        significant = False
        significance_desc = "Sem p-valores disponíveis."
        pvals = {}

    data_points = len(df_monthly)
    confidence_level, confidence_desc, _ = evaluate_model_confidence(
        data_points,
        warning=best.get("warning"),
        min_data_points=MIN_DATA_POINTS_FOR_TIMESERIES * 2,
    )
    if best.get("warning"):
        confidence_level = "Baixa"
        confidence_desc = f"Baixa. {best['warning']}"
    elif data_points < MIN_DATA_POINTS_FOR_TIMESERIES * 2:
        confidence_level = "Média"
        confidence_desc = "Volume de dados um pouco baixo para alta confiabilidade."
    else:
        confidence_level = "Alta"
        confidence_desc = "O modelo foi ajustado com base em dados consistentes e não apresentou problemas."

    return {
        "historical": historical_data,
        "forecast": forecast_out,
        "model_used": best.get("model_used"),
        "aic": best.get("aic"),
        "bic": arma_result.get("bic"),
        "order": arma_result.get("order"),
        "warning": best.get("warning"),
        "significance": significant,
        "significance_desc": significance_desc,
        "confidence_level": confidence_level,
        "confidence_desc": confidence_desc,
        "pvalues": pvals,
        "model_details": {
            "type": best.get("model_used"),
            "order_or_family": "ARMA (1, 1)" if best.get("model_used") == "ARMA" else "GLM",
            "aic": best.get("aic"),
            "significant": significant,
            "pvalues": pvals,
            "confidence_level": confidence_level,
            "confidence_desc": confidence_desc,
            "warning": best.get("warning"),
            "significance_desc": significance_desc,
        },
    }
