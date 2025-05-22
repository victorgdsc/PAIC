import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useData } from '@/context/DataContext';
import { toast } from "@/lib/toast-helpers";
import { Bar as RechartsBar, XAxis, YAxis, CartesianGrid, Tooltip, Line, ResponsiveContainer, ComposedChart } from 'recharts';
import { BarChart } from 'lucide-react';

const QuestionMarkIcon = () => (
  <span className="flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-xs font-bold cursor-help">
    ?
  </span>
);

export interface AdvancedParetoData {
  labels: string[];
  values: number[];
  cumulative: number[];
}

interface AdvancedParetoChartProps {
  fileId: string;
}

interface ToggleParetoChartProps {
  atrasados: AdvancedParetoData;
  adiantados: AdvancedParetoData;
  title?: string;
  hideToggle?: boolean;
  viewMode: "late" | "early";
  onViewChange?: (view: "late" | "early") => void;
}

const AdvancedParetoChart: React.FC<AdvancedParetoChartProps> = ({
  fileId,
}) => {
  const safeFileId = fileId ?? "";
  const [factor, setFactor] = useState<string>("");
  const [factorValue, setFactorValue] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [factorValues, setFactorValues] = useState<string[]>([]);
  const [atrasadosData, setAtrasadosData] = useState<AdvancedParetoData>({
    labels: [],
    values: [],
    cumulative: [],
  });
  const [adiantadosData, setAdiantadosData] = useState<AdvancedParetoData>({
    labels: [],
    values: [],
    cumulative: [],
  });
  type CrossAnalysisData =
    | { atrasados: AdvancedParetoData; adiantados: AdvancedParetoData }
    | { error: string };
  const [crossAnalysis, setCrossAnalysis] = useState<
    Record<string, CrossAnalysisData>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [metricType, setMetricType] = useState<"avg" | "sum" | "score">("avg");
  const [viewMode, setViewMode] = useState<"late" | "early">("late");

  const { columns } = useData();

  const handleFactorChange = (newFactor: string) => {
    setFactor(newFactor);
    setFactorValue("ALL");
  };

  useEffect(() => {
    if (!safeFileId) return;
    api
      .post("/api/scatter-data", { fileId: safeFileId })
      .then((res) => {
        const colNames = (res.data.columns || []).filter((name: string) => {
          const column = columns.find((col) => col.name === name);
          return (
            !column?.isNumeric &&
            name !== "actual_date" &&
            name !== "delay_days" &&
            name !== "estimated_date"
          );
        });
        setAvailableColumns(colNames);
        if (!factor && colNames.length > 0) {
          setFactor(colNames[0]);
        }
        setStartDate(res.data.min_date || "");
        setEndDate(res.data.max_date || "");
      })
      .catch(() => {
        setAvailableColumns([]);
      });
  }, [safeFileId, columns]);

  useEffect(() => {
    if (!safeFileId || !factor) return;
    api
      .post("/api/scatter-factor-values", {
        fileId: safeFileId,
        fator: factor,
      })
      .then((res) => {
        const values = res.data.values || [];
        setFactorValues(values);
        if (!values.includes(factorValue)) setFactorValue("ALL");
      })
      .catch(() => setFactorValues([]));
  }, [safeFileId, factor]);

  const fetchParetoData = async () => {
    setIsLoading(true);
    try {
      const requestBody = {
        fileId: safeFileId,
        fator: factor,
        fatorValor: factorValue || undefined,
        dataInicio: startDate || undefined,
        dataFim: endDate || undefined,
        tipoMetrica: metricType,
      };

      const result = (
        await api.post("/api/analyze/pareto-advanced", requestBody)
      ).data;

      if (!result.pareto_principal)
        throw new Error("Dados inválidos do servidor");

      const recalculateCumulative = (vals: number[]): number[] => {
        const total = vals.reduce((acc, v) => acc + v, 0);
        let running = 0;
        return vals.map((v) => {
          running += v;
          return total === 0
            ? 0
            : parseFloat(((running / total) * 100).toFixed(2));
        });
      };

      const splitData = (d: AdvancedParetoData) => {
        const atrasados: AdvancedParetoData = {
          labels: [],
          values: [],
          cumulative: [],
        };
        const adiantados: AdvancedParetoData = {
          labels: [],
          values: [],
          cumulative: [],
        };
        d.labels.forEach((label, index) => {
          const value = d.values[index];
          if (value >= 0) {
            atrasados.labels.push(label);
            atrasados.values.push(value);
          } else {
            adiantados.labels.push(label);
            adiantados.values.push(Math.abs(value));
          }
        });
        atrasados.cumulative = recalculateCumulative(atrasados.values);
        const sorted = adiantados.values
          .map((v, i) => ({ v, l: adiantados.labels[i] }))
          .sort((a, b) => b.v - a.v);
        adiantados.labels = sorted.map((x) => x.l);
        adiantados.values = sorted.map((x) => x.v);
        adiantados.cumulative = recalculateCumulative(adiantados.values);
        return { atrasados, adiantados };
      };

      const principalSplit = splitData({
        labels: result.pareto_principal.categories,
        values: result.pareto_principal.values,
        cumulative: result.pareto_principal.cumulative,
      });

      setAtrasadosData(principalSplit.atrasados);
      setAdiantadosData(principalSplit.adiantados);

      const newCross: Record<string, CrossAnalysisData> = {};
      for (const [key, analysis] of Object.entries(
        result.analise_cruzada || {}
      )) {
        if (key === "estimated_date") continue;
        const column = columns.find((col) => col.name === key);
        if (column?.isNumeric) continue;

        if (
          typeof analysis === "object" &&
          "categories" in analysis &&
          "values" in analysis &&
          "cumulative" in analysis
        ) {
          const split = splitData({
            labels: Array.isArray(analysis.categories)
              ? analysis.categories
              : [],
            values: Array.isArray(analysis.values) ? analysis.values : [],
            cumulative: Array.isArray(analysis.cumulative)
              ? analysis.cumulative
              : [],
          });
          newCross[key] = split;
        } else {
          newCross[key] = { error: (analysis as any).error };
        }
      }
      setCrossAnalysis(newCross);
    } catch (error: any) {
      toast.error(`Erro ao carregar dados do gráfico: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!safeFileId || !factor) return;
    fetchParetoData();
  }, [factor, factorValue, safeFileId, startDate, endDate, metricType]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <BarChart className="h-5 w-5 mr-2 text-primary" />
          Análise de Pareto
        </CardTitle>
        <CardDescription>
          Identifique os principais fatores que mais impactam os atrasos usando
          o princípio de Pareto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1 h-full flex flex-col">
              <label className="text-sm font-medium text-gray-700">Fator</label>
              <div className="mt-1 flex-grow">
                <Select
                  value={factor}
                  onValueChange={handleFactorChange}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione um fator" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1 h-full flex flex-col">
              <label className="text-sm font-medium text-gray-700">
                Filtrar por valor
              </label>
              <div className="mt-1 flex-grow">
                <Select
                  value={factorValue}
                  onValueChange={setFactorValue}
                  disabled={isLoading || !factor}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {factorValues.map((val) => (
                      <SelectItem key={val} value={val}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1 h-full flex flex-col">
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Tipo de Métrica
                </label>
                <div className="group relative">
                  <QuestionMarkIcon />
                  <div className="absolute z-10 hidden group-hover:block w-72 p-3 text-xs bg-popover text-popover-foreground rounded-md shadow-lg border">
                    <p className="font-semibold mb-2">
                      Quando usar cada métrica:
                    </p>
                    <ul className="space-y-2">
                      <li>
                        <span className="font-medium">Soma:</span>
                        <p className="text-muted-foreground mt-0.5">
                          Ideal para identificar quais fatores acumulam o maior
                          volume total de atraso ou adiantamento, mesmo com
                          poucos casos de valores altos.
                        </p>
                      </li>
                      <li>
                        <span className="font-medium">Média:</span>
                        <p className="text-muted-foreground mt-0.5">
                          Melhor para entender a gravidade média dos atrasos por
                          fator, equilibrando fatores com muitos e poucos
                          registros.
                        </p>
                      </li>
                      <li>
                        <span className="font-medium">Pontuação:</span>
                        <p className="text-muted-foreground mt-0.5">
                          Combina quantidade e severidade, dando mais peso para
                          fatores que atrasam muito e com frequência,
                          identificando os de maior impacto.
                        </p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-1">
                <Select
                  value={metricType}
                  onValueChange={(val) => setMetricType(val as any)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avg">Média</SelectItem>
                    <SelectItem value="sum">Soma</SelectItem>
                    <SelectItem value="score">Pontuação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1 h-full flex flex-col">
              <label className="text-sm font-medium text-gray-700">
                Período
              </label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {isLoading ? (
          <div className="h-[300px]">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <>
            {factor !== "estimated_date" && factorValue === "ALL" && (
              <ToggleParetoChart
                atrasados={atrasadosData}
                adiantados={adiantadosData}
                hideToggle={false}
                viewMode={viewMode}
                onViewChange={setViewMode}
              />
            )}
            {factorValue !== "ALL" &&
              Object.entries(crossAnalysis).length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">
                    Análise Cruzada
                  </h3>
                  <div className="space-y-8">
                    {Object.entries(crossAnalysis).map(([key, value]) => (
                      <div
                        key={key}
                        className="border rounded-lg p-4 bg-card shadow-sm"
                      >
                        <div className="text-lg font-semibold mb-4">{key}</div>
                        {"error" in value ? (
                          <span className="text-xs text-red-500">
                            Erro: {value.error}
                          </span>
                        ) : (
                          <CrossAnalysisItem
                            key={key}
                            id={key}
                            atrasados={value.atrasados}
                            adiantados={value.adiantados}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const CrossAnalysisItem: React.FC<
  { id: string } & Omit<ToggleParetoChartProps, "viewMode" | "onViewChange">
> = ({ id, ...props }) => {
  const [viewMode, setViewMode] = useState<"late" | "early">("late");
  return (
    <ToggleParetoChart
      {...props}
      viewMode={viewMode}
      onViewChange={setViewMode}
    />
  );
};

const ToggleParetoChart: React.FC<ToggleParetoChartProps> = ({
  atrasados,
  adiantados,
  title,
  hideToggle,
  viewMode,
  onViewChange,
}) => {
  const data = viewMode === "late" ? atrasados : adiantados;
  const chartData = data.labels.map((label, i) => ({
    name: label,
    value: data.values[i],
    cumulative: data.cumulative[i],
  }));

  const chartColors = {
    bar: "#3b82f6",
    line: "#10b981",
    barHover: "#2563eb",
    lineHover: "#059669",
  };

  return (
    <div>
      {!hideToggle && onViewChange && (
        <div className="flex gap-2 mb-2">
          <Button
            variant={viewMode === "late" ? "default" : "outline"}
            onClick={() => onViewChange("late")}
          >
            Atrasados
          </Button>
          <Button
            variant={viewMode === "early" ? "default" : "outline"}
            onClick={() => onViewChange("early")}
          >
            Adiantados
          </Button>
        </div>
      )}
      {title && (
        <h4 className="text-sm font-medium mb-2">
          {title} - {viewMode === "late" ? "Atrasos" : "Adiantamentos"}
        </h4>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={60}
            tick={{ fontSize: 12 }}
          />
          <YAxis yAxisId="left" orientation="left" />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover text-popover-foreground p-2 border rounded-md text-sm">
                    <p className="font-medium">{label}</p>
                    <p>Valor: {payload[0].value}</p>
                    <p>Acumulado: {payload[1]?.value}%</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <RechartsBar
            yAxisId="left"
            dataKey="value"
            fill={chartColors.bar}
            name={viewMode === "late" ? "Atraso (dias)" : "Adiantamento (dias)"}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            stroke={chartColors.line}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: chartColors.lineHover }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AdvancedParetoChart;
