import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
import warnings

warnings.filterwarnings("ignore", message="No supported index is available")
warnings.filterwarnings("ignore", message="An unsupported index was provided")
warnings.filterwarnings("ignore", message="A date index has been provided")


def get_arma_forecast(
    df: pd.DataFrame, date_col="actual_date", value_col="delay_days", steps=12
):

    forecast_start_date = (pd.Timestamp.now() + pd.offsets.MonthBegin(1)).normalize()
    forecast_dates = pd.date_range(start=forecast_start_date, periods=steps, freq="MS")

    if date_col not in df.columns or value_col not in df.columns:
        return {
            "error": f"Colunas necessárias '{date_col}' ou '{value_col}' não encontradas.",
            "historical": [],
            "forecast": [],
        }

    if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
        try:
            df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
            if df[date_col].isnull().any():
                raise ValueError("Falha ao converter coluna de data.")
        except Exception as e:
            return {
                "error": f"Coluna de data '{date_col}' não está no formato datetime e falhou na conversão: {e}",
                "historical": [],
                "forecast": [],
            }

    if not pd.api.types.is_numeric_dtype(df[value_col]):
        try:
            df[value_col] = pd.to_numeric(df[value_col], errors="coerce")
            if df[value_col].isnull().any():
                df[value_col] = df[value_col].fillna(df[value_col].mean())
        except Exception as e:
            return {
                "error": f"Coluna de valor '{value_col}' não é numérica e falhou na conversão: {e}",
                "historical": [],
                "forecast": [],
            }

    df_ts = df[[date_col, value_col]].copy()
    df_ts = df_ts.dropna(subset=[date_col, value_col])
    df_ts = df_ts.sort_values(by=date_col)
    df_ts.set_index(date_col, inplace=True)

    try:
        monthly_data = df_ts[value_col].resample("ME").mean()
    except ValueError:
        try:
            monthly_data = df_ts[value_col].resample("M").mean()
        except Exception as e_resample:
            return {
                "error": f"Falha ao agregar dados temporalmente: {e_resample}",
                "historical": [],
                "forecast": [],
            }

    if len(monthly_data.dropna()) < 15:
        historical_formatted = [
            {"date": idx.strftime("%Y-%m-%d"), "actual_delay": val}
            for idx, val in monthly_data.dropna().items()
        ]
        simple_forecast_val = (
            monthly_data.dropna().tail(3).mean()
            if len(monthly_data.dropna()) >= 3
            else monthly_data.dropna().mean()
        )
        if pd.isna(simple_forecast_val):
            simple_forecast_val = 0

        forecast_simple = [
            {
                "date": dt.strftime("%Y-%m-%d"),
                "predicted_delay": round(simple_forecast_val, 2),
                "conf_int_lower": round(simple_forecast_val * 0.8, 2),
                "conf_int_upper": round(simple_forecast_val * 1.2, 2),
            }
            for dt in forecast_dates
        ]

        return {
            "error": f"Dados mensais insuficientes ({len(monthly_data.dropna())}) para análise ARMA. Mínimo: 15. Mostrando previsão baseada na média.",
            "historical": historical_formatted,
            "forecast": forecast_simple,
            "model_used": "Média Simples (Fallback)",
        }

    monthly_data_filled = monthly_data.interpolate(method="linear")
    monthly_data_filled = monthly_data_filled.bfill().ffill()

    if monthly_data_filled.isnull().any():
        return {
            "error": "Falha ao preencher valores ausentes na série temporal.",
            "historical": [],
            "forecast": [],
        }

    historical_formatted = [
        {"date": idx.strftime("%Y-%m-%d"), "actual_delay": round(val, 2)}
        for idx, val in monthly_data_filled.items()
    ]

    try:
        order = (1, 0, 1)
        model = ARIMA(monthly_data_filled, order=order)
        model_fit = model.fit()
        forecast_result = model_fit.get_forecast(steps=steps)
        forecast_values = forecast_result.predicted_mean
        conf_int = forecast_result.conf_int(alpha=0.05)
        forecast_values.index = forecast_dates
        conf_int.index = forecast_dates

        forecast_formatted = [
            {
                "date": idx.strftime("%Y-%m-%d"),
                "predicted_delay": round(forecast_values.loc[idx], 2),
                "conf_int_lower": round(conf_int.loc[idx].iloc[0], 2),
                "conf_int_upper": round(conf_int.loc[idx].iloc[1], 2),
            }
            for idx in forecast_dates
        ]

        return {
            "historical": historical_formatted,
            "forecast": forecast_formatted,
            "model_used": "ARMA",
            "order": "ARMA(1,1)",
            "error": None,
        }

    except Exception as e:
        simple_forecast_val = monthly_data_filled.mean()
        if pd.isna(simple_forecast_val):
            simple_forecast_val = 0

        forecast_simple = [
            {
                "date": dt.strftime("%Y-%m-%d"),
                "predicted_delay": round(simple_forecast_val, 2),
                "conf_int_lower": round(simple_forecast_val * 0.8, 2),
                "conf_int_upper": round(simple_forecast_val * 1.2, 2),
            }
            for dt in forecast_dates
        ]
        return {
            "error": f"Falha no modelo ARMA: {str(e)}. Usando média como fallback.",
            "historical": historical_formatted,
            "forecast": forecast_simple,
            "model_used": "Média Simples (Fallback ARMA)",
        }
