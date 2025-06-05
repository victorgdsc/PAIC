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
    """
    Prepara a série temporal mensal de delay_days a partir do DataFrame original.
    """


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
    """
    Gera datas mensais futuras para previsão.
    """


    forecast_start_date = (pd.Timestamp.now() + pd.offsets.MonthBegin(1)).normalize()
    return pd.date_range(start=forecast_start_date, periods=FORECAST_PERIODS, freq="MS")


def _run_arma_model(
    df_monthly: pd.Series, forecast_dates: pd.DatetimeIndex
) -> Dict[str, Any]:
    """
    Ajusta modelo ARMA(p,q) e retorna previsões e métricas, buscando melhor AIC.
    """
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
        "order": None,
        "pvalues": {},
        "fittedvalues": None,
        "mean_ci_width": None,
    }
    if len(df_monthly) < MIN_DATA_POINTS_FOR_TIMESERIES:
        result["warning"] = (
            f"Forecast NÃO CONFIÁVEL: ARMA requer pelo menos {MIN_DATA_POINTS_FOR_TIMESERIES} pontos mensais (encontrados {len(df_monthly)}). Previsão gerada, mas pode não ser confiável."
        )
        result["unreliable"] = True
    try:
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=ConvergenceWarning)
            warnings.filterwarnings("ignore", category=ValueWarning)
            warnings.filterwarnings("ignore", category=UserWarning)
            best_aic = None
            best_fit = None
            best_order = None
            best_pvalues = None
            best_bic = None
            best_fittedvalues = None
            best_forecast = None
            best_ci_lower = None
            best_ci_upper = None
            best_mean_ci_width = None
            for order in [(1,0,1), (2,0,1), (1,0,2), (2,0,2)]:
                try:
                    print(f"[DEBUG][ARMA{order}] Tentando ajustar ARIMA com ordem {order}")
                    model = ARIMA(df_monthly, order=order)
                    model_fit = model.fit()
                    aic = model_fit.aic
                    bic = model_fit.bic
                    fittedvalues = model_fit.fittedvalues
                    forecast = model_fit.get_forecast(steps=len(forecast_dates))
                    ci = forecast.conf_int(alpha=0.05)
                    ci_lower = ci.iloc[:, 0].tolist() if hasattr(ci, 'iloc') else ci[:, 0].tolist()
                    ci_upper = ci.iloc[:, 1].tolist() if hasattr(ci, 'iloc') else ci[:, 1].tolist()
                    mean_ci_width = float(np.mean(np.array(ci_upper) - np.array(ci_lower))) if len(ci_lower) > 0 else None
                    rmse = float(np.sqrt(np.mean((df_monthly.values - np.array(fittedvalues)) ** 2)))
                    print(f"[DEBUG][ARMA{order}] AIC={aic}, RMSE={rmse}, mean_ci_width={mean_ci_width}")
                    if best_aic is None or aic < best_aic:
                        best_aic = aic
                        best_bic = bic
                        best_order = order
                        best_fit = model_fit
                        best_pvalues = getattr(model_fit, 'pvalues', None)
                        best_fittedvalues = fittedvalues
                        best_forecast = forecast.predicted_mean
                        best_ci_lower = ci_lower
                        best_ci_upper = ci_upper
                        best_mean_ci_width = mean_ci_width
                except Exception as e:
                    print(f"[DEBUG][ARMA{order}] Falhou: {e}")
                    continue
            if best_fit is None:
                result["error"] = "Nenhum modelo ARMA convergiu."
                return result
            result["aic"] = best_aic
            result["bic"] = best_bic
            result["order"] = f"ARMA{best_order}"
            result["pvalues"] = best_pvalues
            result["fittedvalues"] = best_fittedvalues.tolist() if best_fittedvalues is not None else None
            result["forecast"] = best_forecast.tolist() if best_forecast is not None else []
            result["ci_lower"] = best_ci_lower if best_ci_lower is not None else []
            result["ci_upper"] = best_ci_upper if best_ci_upper is not None else []
            residuals = best_fit.resid
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
            return result
    except Exception as e:
        result["error"] = str(e)
        return result


def _run_glm_model(df_monthly: pd.Series, forecast_dates: pd.DatetimeIndex) -> Dict[str, Any]:
    """
    Ajusta modelo GLM e retorna previsões e métricas.
    """
    result = {
        "forecast": [],
        "ci_lower": [],
        "ci_upper": [],
        "model_used": "GLM",
        "aic": None,
        "warning": None,
        "mean_ci_width": None,
    }
    try:
        if df_monthly.isnull().any():
            result["warning"] = "Série temporal contém valores nulos."
            return result
        if len(df_monthly) < 3:
            result["warning"] = "Série temporal deve ter pelo menos 3 pontos."
            return result
        if df_monthly.nunique() == 1:
            result["warning"] = "Série temporal é constante."
            return result
        print(f"[DEBUG][GLM] Série temporal: {df_monthly.values}")
        X = sm.add_constant(np.arange(len(df_monthly)))
        glm_model = sm.GLM(df_monthly.values, X, family=sm.families.Gaussian()).fit()
        print(f"[DEBUG][GLM] Coeficientes: {glm_model.params}")
        Xf = sm.add_constant(
            np.arange(len(df_monthly), len(df_monthly) + len(forecast_dates))
        )
        pred = glm_model.get_prediction(Xf)
        glm_forecast = pred.predicted_mean.tolist()
        ci_glm = pred.conf_int(alpha=0.05)
        if hasattr(ci_glm, 'iloc'):
            glm_ci_lower = ci_glm.iloc[:, 0].tolist()
            glm_ci_upper = ci_glm.iloc[:, 1].tolist()
        else:
            glm_ci_lower = ci_glm[:, 0].tolist()
            glm_ci_upper = ci_glm[:, 1].tolist()
        mean_ci_width_glm = float(np.mean(np.array(glm_ci_upper) - np.array(glm_ci_lower))) if len(glm_ci_lower) > 0 else None
        rmse_glm = float(np.sqrt(np.mean((df_monthly.values - glm_model.predict(X)) ** 2)))
        print(f"[DEBUG][GLM] AIC={getattr(glm_model, 'aic', None)}, RMSE={rmse_glm}, mean_ci_width={mean_ci_width_glm}")
        result["forecast"] = glm_forecast
        result["ci_lower"] = glm_ci_lower
        result["ci_upper"] = glm_ci_upper
        result["aic"] = getattr(glm_model, "aic", None)
        result["mean_ci_width"] = mean_ci_width_glm
        if hasattr(glm_model, "pvalues"):
            pvals = glm_model.pvalues
            if isinstance(pvals, pd.Series):
                result["pvalues"] = pvals.to_dict()
            elif isinstance(pvals, np.ndarray):
                if hasattr(glm_model, "params") and hasattr(glm_model.params, "index"):
                    keys = list(glm_model.params.index)
                    result["pvalues"] = {k: float(v) for k, v in zip(keys, pvals)}
                else:
                    result["pvalues"] = {str(i): float(v) for i, v in enumerate(pvals)}
            elif isinstance(pvals, dict):
                result["pvalues"] = {k: float(v) for k, v in pvals.items()}
            else:
                result["pvalues"] = {}
        return result
    except Exception as e:
        result["warning"] = f"Falha ao ajustar modelo GLM: {str(e)}"
        return result


def run_and_evaluate_forecasts(df: pd.DataFrame) -> Dict[str, Any]:

    df_monthly, error, historical_data = _prepare_time_series_data(df)
    if error:
        return {"error": error, "historical": historical_data}

    forecast_dates = _generate_forecast_dates()
    arma_result = _run_arma_model(df_monthly, forecast_dates)

    glm_result = _run_glm_model(df_monthly, forecast_dates)


    if arma_result.get("error"):
        best = glm_result
    else:
        arma_p = arma_result.get("quality_metrics", {}).get("ljung_box_pvalue")
        mean_ci_arma = arma_result.get("mean_ci_width")
        mean_ci_glm = glm_result.get("mean_ci_width")

        if arma_p is not None and arma_p < 0.05:
            best = glm_result
        elif mean_ci_glm is not None and mean_ci_arma is not None and mean_ci_glm <= 10 and mean_ci_glm < mean_ci_arma:
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
    if isinstance(pvals, pd.Series):
        pvals = pvals.to_dict()
    if pvals is not None and len(pvals) > 0:
        significant, significance_desc, pvals = evaluate_model_significance(pvals)
    else:
        significant = False
        significance_desc = "Sem p-valores disponíveis."
        pvals = {}

    data_points = len(df_monthly)

    rmse = None
    try:
        if best.get("model_used") == "ARMA" and "forecast" in arma_result:
            arma_fit = arma_result.get("fittedvalues")
            if arma_fit is not None and len(arma_fit) == len(df_monthly):
                rmse = float(np.sqrt(np.mean((df_monthly.values - np.array(arma_fit)) ** 2)))
        elif best.get("model_used") == "GLM":
            X = sm.add_constant(np.arange(len(df_monthly)))
            glm_model = sm.GLM(df_monthly.values, X, family=sm.families.Gaussian()).fit()
            glm_pred = glm_model.predict(X)
            rmse = float(np.sqrt(np.mean((df_monthly.values - glm_pred) ** 2)))
    except Exception:
        pass

    mean_ci_width = None
    try:
        ci_lower = best.get("ci_lower")
        ci_upper = best.get("ci_upper")
        if ci_lower is not None and ci_upper is not None and len(ci_lower) == len(ci_upper) and len(ci_lower) > 0:
            mean_ci_width = float(np.mean(np.array(ci_upper) - np.array(ci_lower)))
        else:
            mean_ci_width = None
    except Exception as e:
        print(f"Erro ao calcular mean_ci_width: {e}")
        mean_ci_width = None

    print(f"[DEBUG] RMSE calculado: {rmse}")
    print(f"[DEBUG] mean_ci_width calculado: {mean_ci_width}")

    confidence_level, confidence_desc, _ = evaluate_model_confidence(
        data_points,
        warning=best.get("warning"),
        min_data_points=MIN_DATA_POINTS_FOR_TIMESERIES * 2,
        rmse=rmse,
        mean_ci_width=mean_ci_width,
    )

    return {
        "historical": historical_data,
        "forecast": forecast_out,
        "model_used": best.get("model_used"),
        "aic": best.get("aic"),
        "bic": arma_result.get("bic"),
        "order": arma_result.get("order") if best.get("model_used") == "ARMA" else None,
        "warning": best.get("warning"),
        "significance": significant if best.get("model_used") == "ARMA" else False,
        "significance_desc": significance_desc if best.get("model_used") == "ARMA" else "Sem p-valores disponíveis.",
        "confidence_level": confidence_level,
        "confidence_desc": confidence_desc,
        "pvalues": pvals if best.get("model_used") == "ARMA" else {},
        "model_details": {
            "type": best.get("model_used"),
            "order_or_family": f"ARMA{best.get('order')}" if best.get("model_used") == "ARMA" and best.get("order") is not None else "GLM",
            "aic": best.get("aic"),
            "significant": significant,
            "pvalues": pvals,
            "confidence_level": confidence_level,
            "confidence_desc": confidence_desc,
            "warning": best.get("warning"),
            "significance_desc": significance_desc,
        },
    }
