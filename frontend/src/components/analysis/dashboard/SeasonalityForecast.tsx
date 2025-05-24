import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getForecast, api } from "@/lib/api";
import { Loader2, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

interface ForecastDataPoint {
  date: string;
  predicted_delay: number;
  conf_int_lower: number;
  conf_int_upper: number;
}

interface HistoricalDataPoint {
  date: string;
  actual_delay: number;
}

interface ModelDetails {
  type: string;
  order_or_family: string;
  aic: number;
  significant: boolean;
  pvalues?: { [key: string]: number };
  confidence_level: "Alta" | "Média" | "Baixa";
  confidence_desc: string;
  warning?: string;
  significance_desc?: string;
}

interface ForecastApiResponse {
  historical: HistoricalDataPoint[];
  forecast: ForecastDataPoint[];
  model_details?: ModelDetails | null;
  message: string;
  error?: string;
}

const SeasonalityForecast: React.FC = () => {
  const { getFactorValueMap, fileInfo, columns } = useData();
  const [selectedFactor, setSelectedFactor] = useState<string>("overall");
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [factorValues, setFactorValues] = useState<string[]>([]); // NEW STATE
  const [forecastData, setForecastData] = useState<ForecastApiResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isWaitingForFileId, setIsWaitingForFileId] = useState<boolean>(true);

  const factors = useMemo(() => getFactorValueMap(), [getFactorValueMap]);
  const factorOptions = useMemo(() => Object.keys(factors || {}), [factors]);

  const valueOptions = useMemo(() => {
    if (selectedFactor === "overall" || !factorValues) {
      return [];
    }
    return factorValues.length > 100 ? factorValues.slice(0, 100) : factorValues;
  }, [selectedFactor, factorValues]);

  const getIsNumeric = (factorName: string) => {
    const col = Object.keys(factors).find((c) => c === factorName);
    const colObj = columns?.find((col) => col.name === factorName);
    return colObj?.isNumeric === true;
  };

  useEffect(() => {
    if (fileInfo?.fileId) {
      setIsWaitingForFileId(false);
    } else {
      setIsWaitingForFileId(true);
    }
  }, [fileInfo?.fileId]);

  useEffect(() => {
    const fetchFactorValues = async () => {
      if (!fileInfo?.fileId || selectedFactor === "overall" || getIsNumeric(selectedFactor)) {
        setFactorValues([]);
        setSelectedValue("");
        return;
      }
      try {
        const res = await api.post('/api/forecast-factor-values', {
          fileId: fileInfo.fileId,
          fator: selectedFactor
        });
        setFactorValues(res.data.values || []);
        setSelectedValue("");
      } catch (err) {
        setFactorValues([]);
        setSelectedValue("");
      }
    };
    fetchFactorValues();
  }, [selectedFactor, fileInfo?.fileId]);

  useEffect(() => {
    const fetchForecast = async () => {
      setIsLoading(true);
      setError(null);
      setForecastData(null);

      if (!fileInfo?.fileId) {
        setError(
          "ID do arquivo (name) não encontrado. Por favor, recarregue os dados."
        );
        setIsLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.append("fileId", fileInfo.fileId);
      if (selectedFactor !== "overall") {
        params.append("factor_col", selectedFactor);
        if (selectedValue) {
          if (getIsNumeric(selectedFactor)) {
            const v = parseFloat(selectedValue);
            if (!isNaN(v)) {
              const delta = Math.max(1, v * 0.05);
              params.append("factor_value_min", String(v - delta));
              params.append("factor_value_max", String(v + delta));
            }
          } else {
            params.append("factor_value", selectedValue);
          }
        } else {
          setIsLoading(false);
          return;
        }
      }
      try {
        const data = await getForecast(params);
        setForecastData(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch forecast data.");
      } finally {
        setIsLoading(false);
      }
    };

    if (
      !isWaitingForFileId &&
      fileInfo?.fileId &&
      (selectedFactor === "overall" ||
        (selectedFactor !== "overall" && selectedValue))
    ) {
      fetchForecast();
    } else {
      setForecastData(null);
      setError(null);
    }
  }, [selectedFactor, selectedValue, fileInfo?.fileId, isWaitingForFileId]);

  const chartData = useMemo(() => {
    if (
      !forecastData ||
      !Array.isArray(forecastData.historical) ||
      !Array.isArray(forecastData.forecast)
    ) {

      return [];
    }

    const parseNumeric = (value: any): number | null => {
      const num = Number(value);
      return !isNaN(num) && isFinite(num) ? num : null;
    };

    const historicalPoints = forecastData.historical.map((d) => ({
      date: typeof d.date === "string" ? d.date : String(d.date),
      delay: parseNumeric(d.actual_delay),
      type: "Actual",
    }));

    const forecastPoints = forecastData.forecast.map((d) => ({
      date: typeof d.date === "string" ? d.date : String(d.date),
      delay: parseNumeric(d.predicted_delay),
      conf_lower: parseNumeric(d.conf_int_lower),
      conf_upper: parseNumeric(d.conf_int_upper),
      type: "Forecast",
    }));

    let connectionPoint: any[] = [];
    if (historicalPoints.length > 0 && forecastPoints.length > 0) {
      const lastHistorical = historicalPoints[historicalPoints.length - 1];
      const firstForecastDate = forecastPoints[0]?.date;
      if (typeof firstForecastDate === "string") {
        connectionPoint.push({
          date: firstForecastDate,
          delay: lastHistorical.delay,
          type: "ForecastStart",
        });
      }
    }

    const combined = [
      ...historicalPoints,
      ...connectionPoint,
      ...forecastPoints,
    ];

    const validDateCombined = combined.filter((d) => {
      if (typeof d.date !== "string") return false;
      try {
        return !isNaN(new Date(d.date).getTime());
      } catch (e) {
        return false;
      }
    });

    if (validDateCombined.length === 0) {
      return [];
    }

    const sortedCombined = validDateCombined.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const hasNumericDelay = sortedCombined.some(
      (d) => typeof d.delay === "number"
    );
    if (!hasNumericDelay && sortedCombined.length > 0) {
    }

    return sortedCombined;
  }, [forecastData]);

  const forecastOnlyData = useMemo(() => {
    return chartData.filter(
      (d) =>
        (d.type === "Forecast" || d.type === "ForecastStart") &&
        typeof d.delay === "number" &&
        typeof d.conf_lower === "number" &&
        typeof d.conf_upper === "number"
    );
  }, [chartData]);

  const lastHistoricalDate = useMemo(() => {
    const historicalPointsWithDates = chartData.filter(
      (d) =>
        d.type === "Actual" &&
        typeof d.date === "string" &&
        !isNaN(new Date(d.date).getTime())
    );
    if (historicalPointsWithDates.length === 0) return undefined;
    return historicalPointsWithDates[historicalPointsWithDates.length - 1].date;
  }, [chartData]);

  const yAxisDomain = useMemo(() => {
    if (!forecastOnlyData || forecastOnlyData.length === 0) {
      return ["auto", "auto"];
    }

    let minVal = Infinity;
    let maxVal = -Infinity;

    forecastOnlyData.forEach((d) => {
      if (d.conf_lower !== null && d.conf_lower < minVal) minVal = d.conf_lower;
      if (d.conf_upper !== null && d.conf_upper > maxVal) maxVal = d.conf_upper;
      if (d.delay !== null) {
        if (d.delay < minVal) minVal = d.delay;
        if (d.delay > maxVal) maxVal = d.delay;
      }
    });

    if (minVal === Infinity || maxVal === -Infinity) {
      return ["auto", "auto"];
    }
    const range = maxVal - minVal;
    const padding = range === 0 ? 5 : Math.max(range * 0.1, 1);

    const finalMin = Math.floor(minVal - padding);
    const finalMax = Math.ceil(maxVal + padding);

    return [finalMin, finalMax];
  }, [forecastOnlyData]);

  const formatXAxisTick = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });
  };

  const renderValueInput = () => {
    if (selectedFactor === "overall") return null;
    if (getIsNumeric(selectedFactor)) return null;
    return (
      <div className="w-full md:w-1/4">
        <Select value={selectedValue} onValueChange={setSelectedValue}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar valor do fator" />
          </SelectTrigger>
          <SelectContent>
            {valueOptions.map((val) => (
              <SelectItem key={val} value={val}>
                {val}
              </SelectItem>
            ))}
          </SelectContent>
          {valueOptions.length === 0 && (
            <div style={{ color: '#888', fontSize: 12, padding: '4px 8px' }}>
              Nenhum valor disponível
            </div>
          )}
        </Select>
      </div>
    );
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <TrendingUp className="h-5 w-5 mr-2 text-primary" />
          Previsão de Atraso Mensal (Próximos 12 Meses)
        </CardTitle>
        <CardDescription>
          Previsão do atraso médio mensal com base nos dados históricos, usando
          o melhor modelo (ARMA ou GLM).
        </CardDescription>
        <div className="flex flex-wrap gap-4 pt-4">
          <Select
            value={selectedFactor}
            onValueChange={(value) => {
              setSelectedFactor(value);
              setSelectedValue("");
              setForecastData(null);
              setError(null);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecionar Fator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overall">Geral (Todos os Dados)</SelectItem>
              {factorOptions
                .filter((factor) => !getIsNumeric(factor))
                .map((factor) => (
                  <SelectItem
                    key={factor}
                    value={factor}
                    className="capitalize"
                  >
                    {factor.replace("_", " ")}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {renderValueInput()}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Carregando previsão...</span>
          </div>
        )}
        {error && !isLoading && !isWaitingForFileId && (
          <Alert
            variant="destructive"
            className="h-60 flex flex-col justify-center items-center"
          >
            <AlertCircle className="h-6 w-6" />
            <AlertTitle>Erro ao Carregar Previsão</AlertTitle>
            <AlertDescription className="text-center mt-2">
              {error}
              <br />
              {error.includes("Insufficient monthly data points") &&
                "Tente selecionar 'Geral' ou um filtro com mais dados."}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !isWaitingForFileId && !error && forecastData && (
          <>
            {forecastData.forecast.length > 0 ? (
              <>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer>
                    <LineChart
                      data={forecastOnlyData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatXAxisTick}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval="preserveStartEnd"
                        type="category"
                      />
                      <YAxis
                        label={{
                          value: "Atraso (dias)",
                          angle: -90,
                          position: "insideLeft",
                        }}
                        domain={yAxisDomain}
                        allowDataOverflow={false}
                      />
                      <Tooltip
                        labelFormatter={(label) => formatXAxisTick(label)}
                        formatter={(
                          value: number,
                          name: string,
                          props: any
                        ) => {
                          const pointType = props.payload?.type;
                          const displayName =
                            pointType === "Actual"
                              ? "Atraso Real"
                              : "Atraso Previsto";
                          return [
                            value != null ? value.toFixed(2) : "N/A",
                            displayName,
                          ];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="delay"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        name="Atraso Previsto"
                      />
                      <Line
                        type="monotone"
                        dataKey="conf_upper"
                        stroke="rgba(37, 99, 235, 0.2)"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls
                        name="Limite Superior (95%)"
                      />
                      <Line
                        type="monotone"
                        dataKey="conf_lower"
                        stroke="rgba(37, 99, 235, 0.2)"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls
                        name="Limite Inferior (95%)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {forecastData.model_details && (
                  <Alert variant="default" className="mt-6">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Detalhes do Modelo Utilizado</AlertTitle>
                    <AlertDescription className="mt-2 text-sm space-y-1">
                      <p>
                        <strong>Tipo:</strong>{" "}
                        {forecastData.model_details.order_or_family}
                      </p>
                      <p>
                        <strong>Significância Estatística:</strong>{" "}
                        {forecastData.model_details.significance_desc}
                      </p>
                      {forecastData.model_details.pvalues && (
                        <p className="text-sm text-muted-foreground">
                          <strong>P-valores:</strong>{" "}
                          {Object.entries(forecastData.model_details.pvalues)
                            .map(
                              ([key, value]) => `${key}: ${value.toFixed(2)}`
                            )
                            .join(", ")}
                        </p>
                      )}
                      <p>
                        <strong>Confiabilidade:</strong>{" "}
                        {forecastData.model_details.confidence_level}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {forecastData.model_details.confidence_desc}
                      </p>
                      {forecastData.model_details.warning && (
                        <p className="mt-2 text-sm text-warning-foreground">
                          <AlertCircle className="h-4 w-4 inline mr-1" />
                          {forecastData.model_details.warning}
                        </p>
                      )}
                      <p className="pt-2 text-xs text-muted-foreground">
                        As linhas pontilhadas representam o intervalo de
                        confiança de 95% para a previsão.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px]">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-xl font-semibold text-red-600 mb-2">
                  Não foi possível gerar um modelo confiável
                </h3>
                <p className="text-red-500 text-center max-w-sm">
                  {forecastData?.model_details?.warning ||
                    forecastData?.message ||
                    "O modelo retornou previsão vazia ou com falha."}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SeasonalityForecast;
