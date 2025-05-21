# PAIC Frontend – Guia de Funcionamento

## Estrutura de Pastas e Componentes

O frontend é construído em React + TypeScript e organizado de forma modular. Os principais diretórios e seus papéis são:

- **`src/components/`**  
  Componentes reutilizáveis e de página.
  - `analysis/`: Componentes de análise (dashboards, gráficos, relatórios, preditivo).
    - `dashboard/`: Gráficos e dashboards (ex: `SeasonalityForecast.tsx`, `AdvancedParetoChart.tsx`, `KeyStatistics.tsx`, `ScatterPlot.tsx`)
    - `report/`: Relatórios detalhados (ex: `CriticalFactors.tsx`, `ExecutiveSummary.tsx`, `Recommendations.tsx`, `DeliveryStatusBreakdown.tsx`)
    - `PredictiveAnalysis.tsx`: Análise preditiva personalizada.
  - `layout/`: Layouts globais (`Header.tsx`, `Footer.tsx`, `MainLayout.tsx`)
  - `ui/`: Componentes visuais reutilizáveis (ex: `button.tsx`, `card.tsx`, `toast.tsx`, `tabs.tsx`)
  - **Componentes utilitários soltos**:  
    - `FileUpload.tsx`: Upload de arquivos.
    - `ColumnMapping.tsx`: Mapeamento das colunas do dataset.
    - `ColumnNumericToggle.tsx`: Alternância de colunas numéricas.

- **`src/config/`**  
  Arquivos de configuração (ex: `testConfig.ts`).

- **`src/context/`**  
  Gerenciamento de estado global/contextos (ex: `DataContext.tsx`).

- **`src/hooks/`**  
  Hooks customizados (ex: `use-toast.ts`).

- **`src/lib/`**  
  Funções auxiliares, tipagens e acesso à API:
  - `api.ts`: Funções para comunicação com o backend.
  - `types.ts`: Tipos TypeScript globais.
  - `toast-helpers.ts`, `utils.ts`: Helpers diversos.

- **`src/pages/`**  
  Páginas principais (ex: `Analysis.tsx`, `Index.tsx`, `NotFound.tsx`).

---

## Fluxo do Frontend

1. **Upload do Dataset**
   - Tela inicial permite upload do arquivo CSV.
   - O arquivo é enviado para o backend via API.
   - Após o processamento, o usuário é redirecionado para o dashboard de análise.

2. **Dashboard de Análise**
   - Exibe os principais indicadores de atraso (média, mediana, máximo, tendência).
   - Componentes envolvidos:
     - `DelaySummary.tsx` – Mostra estatísticas principais.
     - `SeasonalityForecast.tsx` – Gráfico de tendência e previsão.
     - `AdvancedParetoChart.tsx` – Gráfico Pareto dos fatores de atraso.
     - `CriticalFactors.tsx` – Lista dos fatores críticos.

3. **Interação com o Backend**
   - Todos os dados exibidos são obtidos através de chamadas à API do backend.
   - Os componentes de análise consomem endpoints específicos (ex: `/api/analyze`, `/api/forecast`, etc).
   - O frontend trata loading, erros e feedbacks ao usuário de forma centralizada.

---

## Principais Componentes

- **SeasonalityForecast.tsx**  
  Exibe o gráfico de tendência e previsão de atrasos mensais. Consome dados processados do backend, mostrando histórico, previsão e intervalos de confiança.

- **AdvancedParetoChart.tsx**  
  Mostra o gráfico de Pareto, destacando os fatores que mais impactam nos atrasos (ex: região, transportadora).

- **CriticalFactors.tsx**  
  Lista fatores críticos, exibindo impacto visual (cores) e contexto, ajudando o usuário a identificar rapidamente os maiores problemas.

- **PredictiveAnalysis.tsx**  
  Permite ao usuário simular cenários (ex: alterar transportadora, região, datas) e ver a previsão personalizada de atraso e sua confiabilidade.

- **ReportPage.tsx**  
  Consolida e apresenta todos os resultados em um relatório final, pronto para exportação ou apresentação.

---

## Comunicação com o Backend

- Todas as requisições à API são feitas via funções em `src/lib/api.ts`.
- O frontend espera respostas no formato JSON, já estruturadas para uso direto nos componentes.

---