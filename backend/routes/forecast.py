from flask import Blueprint, request, jsonify, current_app
import traceback
import pandas as pd
from werkzeug.utils import secure_filename
import os
from utils.analyzer import run_and_evaluate_forecasts
from utils.file_utils import load_processed_dataframe

forecast_bp = Blueprint('forecast', __name__, url_prefix='/api')

@forecast_bp.route('/forecast', methods=['GET'])
def get_forecast_route():
    try:
        factor_col = request.args.get('factor_col')
        factor_value = request.args.get('factor_value')
        file_id = request.args.get('fileId')

        if not file_id:
            return jsonify({'error': 'fileId não fornecido na requisição'}), 400

        df, load_error = load_processed_dataframe(file_id)
        if load_error:
            status_code = 404 if "não encontrado" in load_error else 500

            return jsonify({'error': load_error}), status_code

        required_cols = ['actual_date', 'delay_days']
        if not all(col in df.columns for col in required_cols):
            missing = [col for col in required_cols if col not in df.columns]

            return jsonify({'error': f"Colunas essenciais ({', '.join(missing)}) não encontradas nos dados processados."}), 500

        if not pd.api.types.is_datetime64_any_dtype(df['actual_date']):

             try:
                 df['actual_date'] = pd.to_datetime(df['actual_date'], errors='coerce')
                 if df['actual_date'].isnull().all():
                     raise ValueError("Conversion resulted in all NaNs")

             except Exception as date_err:

                 return jsonify({'error': "Coluna 'actual_date' nos dados processados não está no formato de data correto e não pôde ser convertida."}), 500

        if not pd.api.types.is_numeric_dtype(df['delay_days']):

             df['delay_days'] = pd.to_numeric(df['delay_days'], errors='coerce')
             if df['delay_days'].isnull().all():

                 return jsonify({'error': "Coluna 'delay_days' nos dados processados não é numérica ou contém apenas valores inválidos."}), 500

             df.dropna(subset=['delay_days'], inplace=True)
             if df.empty:

                 return jsonify({'error': "Nenhum dado válido de 'delay_days' restante após conversão."}), 400

        if factor_col and factor_value:
            if factor_col in df.columns:

                original_rows = len(df)
                try:
                    col_dtype = df[factor_col].dtype
                    if pd.api.types.is_numeric_dtype(col_dtype):
                        factor_value_typed = pd.to_numeric(factor_value)
                    elif pd.api.types.is_datetime64_any_dtype(col_dtype):
                         factor_value_typed = pd.to_datetime(factor_value)
                    elif pd.api.types.is_bool_dtype(col_dtype):
                         factor_value_lower = str(factor_value).lower()
                         if factor_value_lower in ['true', '1', 'yes']: factor_value_typed = True
                         elif factor_value_lower in ['false', '0', 'no']: factor_value_typed = False
                         else: raise ValueError("Invalid boolean value for filter")
                    else:
                         factor_value_typed = str(factor_value)

                    df = df[df[factor_col] == factor_value_typed].copy()


                except ValueError as e:

                     return jsonify({'error': f"Valor '{factor_value}' inválido para o tipo de dado ({col_dtype}) do fator '{factor_col}'."}), 400
                except Exception as e:

                     traceback.print_exc()
                     return jsonify({'error': f"Erro inesperado ao aplicar filtro: {e}"}), 500
            else:

                 return jsonify({'error': f"Coluna de fator '{factor_col}' não encontrada nos dados processados."}), 400

        if df.empty:
            filter_msg = f" para o filtro: {factor_col} = {factor_value}" if factor_col else ""

            return jsonify({'error': f"Nenhum dado encontrado{filter_msg}."}), 404

        forecast_results = run_and_evaluate_forecasts(df)

        response_data = {
            "historical": forecast_results.get('historical', []),
            "forecast": [
                {
                    "date": item["date"],
                    "predicted_delay": item["value"],
                    "conf_int_lower": item.get("confidence_lower"),
                    "conf_int_upper": item.get("confidence_upper")
                } for item in forecast_results.get('forecast', [])
            ],
"model_details": {
    "type": forecast_results.get('model_used', 'unknown'),
    "aic": forecast_results.get('aic', None),
    "bic": forecast_results.get('bic', None),
    "order": forecast_results.get('order'),
    "family": forecast_results.get('family'),
    "link": forecast_results.get('link'),
    "order_or_family": (
        f"{forecast_results['order']}" if forecast_results.get('model_used') == 'ARMA' and forecast_results.get('order')
        else f"GLM({'Gaussiana' if forecast_results.get('family') == 'Gaussian' else forecast_results.get('family')})"
            if forecast_results.get('model_used') == 'GLM' and forecast_results.get('family')
        else "N/A"
    ),
    "significant": not (
        (forecast_results.get('model_used') == 'GLM' and "não significativas" in (forecast_results.get('warning') or '')) or
        (forecast_results.get('model_used') == 'ARMA' and "autocorrelação" in (forecast_results.get('warning') or '')) or
        (forecast_results.get('model_used', '').startswith('Mean Forecast')) or
        (forecast_results.get('error') is not None)
    ),
    "pvalues": forecast_results.get('pvalues', {}),
    "significance_desc": forecast_results.get('significance_desc'),
    "confidence_level": forecast_results.get('confidence_level'),
    "confidence_desc": forecast_results.get('confidence_desc'),
},

            "other_model_details": forecast_results.get('other_model_details'),
            "message": (
                forecast_results.get('error')
                or forecast_results.get('warning')
                or "Previsão gerada com sucesso."
            ),
            "error": forecast_results.get('error')
        }

        status_code = 200 if forecast_results.get('error') is None else 400
        return jsonify(response_data), status_code

    except Exception as e:

        traceback.print_exc()
        return jsonify({'error': f'Erro interno inesperado ao gerar a previsão. Verifique os logs do servidor.'}), 500
