import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from statsmodels.formula.api import glm as glm_sm


class DeliveryPredictor:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100)
        self.label_encoders = {}
        self.trained = False

    def prepare_features(self, df, categorical_columns):
        X = df.copy()

        for col in categorical_columns:
            if col not in self.label_encoders:
                self.label_encoders[col] = LabelEncoder()

            X[col] = self.label_encoders[col].fit_transform(X[col].astype(str))

        return X

    def train(self, df, feature_columns, target_column="delay"):
        X = self.prepare_features(
            df[feature_columns],
            [col for col in feature_columns if df[col].dtype == "object"],
        )
        y = df[target_column]

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
        self.model.fit(X_train, y_train)
        self.trained = True

        return self.model.score(X_test, y_test)

    def predict(self, features):
        if not self.trained:
            raise Exception("Modelo não treinado")

        X = self.prepare_features(
            pd.DataFrame([features]),
            [col for col in features.keys() if isinstance(features[col], str)],
        )

        prediction = self.model.predict(X)[0]
        confidence = (
            self.model.predict_proba(X)
            if hasattr(self.model, "predict_proba")
            else None
        )

        return {
            "prediction": float(prediction),
            "confidence": float(confidence[0].max()) if confidence is not None else 0.8,
        }


def clean_data(df, value_col="delay_days", outlier_z=3):
    df = df.dropna(subset=[value_col])
    if len(df) > 0:
        zscores = (df[value_col] - df[value_col].mean()) / df[value_col].std()
        df = df[(zscores.abs() <= outlier_z) | (zscores.isna())]
    return df


def get_glm_forecast(df, value_col="delay_days", features=None):
    try:
        if features is None:
            features = [
                col for col in df.columns if col not in ["delay_days", "actual_date"]
            ]
        df_clean = clean_data(df, value_col)
        df_clean = df_clean.dropna(subset=features)
        if len(df_clean) < 10:
            return {
                "error": "Poucos dados para GLM",
                "prediction": None,
                "model": None,
                "pvalues": None,
            }
        formula = f"{value_col} ~ " + " + ".join(features)
        model = glm_sm(formula, data=df_clean, family=sm.families.Gaussian()).fit()
        prediction = model.predict(df_clean.iloc[-1:])[0]
        return {
            "prediction": prediction,
            "model": model,
            "pvalues": model.pvalues.to_dict(),
            "aic": model.aic,
            "bic": model.bic,
        }
    except Exception as e:
        return {"error": str(e), "prediction": None, "model": None, "pvalues": None}


def predict_delay(df: pd.DataFrame, query: dict, columns: list):
    try:
        query_date = pd.to_datetime(query.get("actual_date")).tz_localize(None)

        filters = {
            k: v
            for k, v in query.items()
            if k not in ["actual_date"] and v not in [None, "", "null"]
        }

        filtered = df.copy()
        filtered["actual_date"] = pd.to_datetime(
            filtered["actual_date"]
        ).dt.tz_localize(None)

        for col, val in filters.items():
            if col.endswith("_min"):
                base_col = col[:-4]
                if base_col in filtered.columns:
                    filtered[base_col] = pd.to_numeric(
                        filtered[base_col], errors="coerce"
                    )
                    try:
                        val_num = float(val)
                    except Exception:
                        val_num = val
                    filtered = filtered[filtered[base_col] >= val_num]
            elif col.endswith("_max"):
                base_col = col[:-4]
                if base_col in filtered.columns:
                    filtered[base_col] = pd.to_numeric(
                        filtered[base_col], errors="coerce"
                    )
                    try:
                        val_num = float(val)
                    except Exception:
                        val_num = val
                    filtered = filtered[filtered[base_col] <= val_num]
            elif col in filtered.columns:
                if filtered[col].dtype == "object":
                    filtered = filtered[
                        filtered[col].astype(str).str.lower() == str(val).lower()
                    ]
                else:
                    filtered = filtered[filtered[col] == val]

        if "actual_date" in filtered.columns and query_date is not None:
            filtered["actual_date"] = pd.to_datetime(filtered["actual_date"])
            same_month = filtered[filtered["actual_date"].dt.month == query_date.month]
            window = filtered[(filtered["actual_date"] >= (query_date - pd.Timedelta(days=30))) & (filtered["actual_date"] <= (query_date + pd.Timedelta(days=30)))]
            filtered = pd.concat([same_month, window]).drop_duplicates()

        if len(filtered) == 0:
            for col in ["Product Group", "Shipment Mode", "Country"]:
                if col in filters and len(filters) > 1:
                    del filters[col]
                    filtered = df.copy()
                    filtered["actual_date"] = pd.to_datetime(
                        filtered["actual_date"]
                    ).dt.tz_localize(None)
                    for c, v in filters.items():
                        if c in filtered.columns:
                            if filtered[c].dtype == "object":
                                filtered = filtered[
                                    filtered[c].astype(str).str.lower()
                                    == str(v).lower()
                                ]
                            else:
                                filtered = filtered[filtered[c] == v]
                    if "actual_date" in filtered.columns and query_date is not None:
                        filtered["actual_date"] = pd.to_datetime(filtered["actual_date"])
                        same_month = filtered[filtered["actual_date"].dt.month == query_date.month]
                        window = filtered[(filtered["actual_date"] >= (query_date - pd.Timedelta(days=30))) & (filtered["actual_date"] <= (query_date + pd.Timedelta(days=30)))]
                        filtered = pd.concat([same_month, window]).drop_duplicates()
                    if len(filtered) > 0:
                        break

        if len(filtered) == 0:
            return {
                "error": "Nenhum dado histórico encontrado para os critérios fornecidos",
                "prediction": 0,
                "probability": 0,
                "similarCases": 0,
                "model_used": "no_data",
            }

        filtered["date_diff"] = (filtered["actual_date"] - query_date).dt.days.abs()
        max_diff = filtered["date_diff"].max()
        min_diff = filtered["date_diff"].min()

        if max_diff > 0:
            filtered["weight"] = 1 - (filtered["date_diff"] - min_diff) / (
                max_diff - min_diff + 1e-6
            )
        else:
            filtered["weight"] = 1.0

        avg_delay = np.average(filtered["delay_days"], weights=filtered["weight"])

        data_amount_factor = 1 - np.exp(-0.03 * len(filtered))

        current_year = query_date.year
        filtered["year"] = filtered["actual_date"].dt.year
        filtered["year_diff"] = abs(filtered["year"] - current_year)

        if filtered["year_diff"].max() > 0:
            filtered["year_weight"] = 1 - (
                filtered["year_diff"] / filtered["year_diff"].max()
            )
        else:
            filtered["year_weight"] = 1.0

        if "weight" in filtered.columns:
            filtered["combined_weight"] = (filtered["weight"] * 0.7) + (
                filtered["year_weight"] * 0.3
            )
        else:
            filtered["combined_weight"] = filtered["year_weight"]

        time_proximity = filtered["combined_weight"].mean()

        if len(filtered) > 1:
            std_dev = filtered["delay_days"].std()
            mean_abs = abs(filtered["delay_days"].mean())
            if mean_abs > 0:
                consistency = 1 / (1 + (std_dev / mean_abs))
            else:
                consistency = 1.0 if std_dev == 0 else 0.1
        else:
            consistency = 0.1

        reliability = (
            data_amount_factor * 0.3 + time_proximity * 0.5 + consistency * 0.2
        ) * 100

        try:
            query_month = query_date.month
            filtered["month"] = filtered["actual_date"].dt.month
            monthly_avg = filtered.groupby("month")["delay_days"].mean()
            if not monthly_avg.empty and query_month in monthly_avg:
                monthly_factor = monthly_avg[query_month] / monthly_avg.mean()
                avg_delay *= monthly_factor
        except Exception as e:
            logger.warning(f"Erro ao ajustar sazonalidade mensal: {str(e)}")

        confidence_interval = [avg_delay * 0.9, avg_delay * 1.1]

        reliability_percent = reliability / 100.0

        return {
            "predictedDelay": float(avg_delay),
            "confidenceInterval": confidence_interval,
            "reliability": reliability_percent,
            "similarCases": len(filtered),
            "model_used": "weighted_historical",
            "query_date": query_date.isoformat(),
            "data_points_used": len(filtered),
        }

    except Exception as e:
        logger.error(f"Erro na previsão: {str(e)}", exc_info=True)
        return {
            "error": f"Erro ao processar a previsão: {str(e)}",
            "predictedDelay": 0,
            "confidenceInterval": [0, 0],
            "reliability": 0,
            "prediction": 0,
            "probability": 0,
            "similarCases": 0,
            "model_used": "error",
        }
