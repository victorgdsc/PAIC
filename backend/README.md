# PAIC Backend – Guia de Funcionamento

### Estrutura Principal do Backend
- **app.py**: Inicializa o servidor Flask e registra as rotas.
- **routes/**: Contém as rotas da API, como análise, previsão, pareto, etc.
- **utils/**: Funções utilitárias para preparação, análise, previsão e manipulação de dados.
- **processed_data/**: Armazena dados processados temporariamente.

## Fluxo do Backend

### 1. Envio e Processamento Inicial do Dataset
O usuário faz upload do arquivo CSV pelo frontend. O backend:
- **Lê e interpreta o arquivo**: Detecta encoding e delimitador, processa em chunks para eficiência.
  - Funções: `parse_csv`, `detect_encoding`, `detect_delimiter`, `process_chunk` (`utils/csv_parser.py`)
- **Valida e prepara os dados**: Garante que as colunas essenciais existem e estão no formato correto, infere tipos automaticamente se necessário.
  - Funções: `prepare_data`, `infer_column_types` (`utils/data_prep.py`)
- **Gerencia arquivos**: Salva e carrega arquivos processados temporariamente.
  - Funções: `allowed_file`, `save_uploaded_file`, `save_processed_dataframe`, `load_processed_dataframe` (`utils/file_utils.py`)

### 2. Análise Estatística Inicial
Após o tratamento dos dados, o sistema calcula estatísticas básicas:
- **Indicadores de atraso**: Média, mediana, máximo, mínimo, desvio padrão, etc.
  - Funções: `calculate_delay_statistics` (`utils/analysis/statistics.py`), `calculate_delay` (`utils/date_utils.py`)
- **Geração de insights automáticos**: Com base nas estatísticas, o sistema destaca padrões e possíveis problemas.
  - Função: `generate_insights` (`utils/analysis/insights.py`)

### 3. Tendência e Gráfico de Dispersão
O backend prepara e analisa a evolução dos atrasos ao longo do tempo:
- **Transforma os dados em séries temporais**: Agrega por mês, interpola valores faltantes.
  - Função: `_prepare_time_series_data` (`utils/analysis/forecast.py`)
- **Calcula tendências e gera dados para gráficos**: Aplica modelos estatísticos para identificar padrões e tendências.
  - Funções: `run_and_evaluate_forecasts`, `_run_arma_model`, `get_arma_forecast`, `get_glm_forecast` (`utils/analysis/forecast.py`, `utils/forecast_utils.py`, `utils/predictor.py`)
  - Avalia a qualidade dos modelos: `evaluate_model_significance`, `evaluate_model_confidence` (`utils/analysis/model_evaluation.py`)

### 4. Forecast (Previsão)
Geração de previsões futuras de atrasos:
- **Executa modelos de previsão**: ARMA para padrões complexos, GLM para tendências lineares. O sistema seleciona automaticamente o melhor.
  - Funções: `run_and_evaluate_forecasts`, `_run_arma_model`, `get_arma_forecast`, `get_glm_forecast`, `evaluate_model_significance`, `evaluate_model_confidence` (mesmos arquivos da etapa anterior)
- **Resultados**: Histórico mensal, previsão dos próximos meses, métricas de avaliação (erro, significância, etc.)

### 5. Pareto
Identificação dos principais fatores que contribuem para o atraso:
- **Análise de fatores**: Agrupa dados por categoria (ex: transportadora, região) e calcula o impacto de cada uma.
  - Funções: `perform_factor_analysis`, `_perform_single_factor_analysis` (`utils/analysis/factors.py`)

### 6. Análise Preditiva (Cenários Específicos)
Permite ao usuário simular cenários e prever atrasos para casos particulares:
- **Previsão personalizada**: Filtra o histórico para casos similares e retorna uma estimativa de atraso usando Random Forest.
  - Função: `predict_delay` (`utils/predictor.py`)
  - Modelo: RandomForestRegressor (scikit-learn)
- **Limpeza e preparação dos dados para previsão**: Remove outliers, ajusta variáveis.
  - Função: `clean_data` (`utils/predictor.py`)
  - Conversão de datas: `parse_date` (`utils/date_utils.py`)

### 7. Relatório de Entregas
Geração de um relatório consolidado de todas as análises:
- **Compila todos os resultados em um JSON estruturado para o frontend**
  - Função: `analyze_data` (`utils/analyzer.py`)

### 8. Fatores Críticos
Apresenta ao usuário os fatores que mais afetam os atrasos:
- **Identificação de fatores críticos**: Mesma análise de Pareto, destacando os principais pontos de atenção.
  - Função: `perform_factor_analysis` (`utils/analysis/factors.py`)

---