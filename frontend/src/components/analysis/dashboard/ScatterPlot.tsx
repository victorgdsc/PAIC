import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { BarChart } from 'lucide-react';

interface ScatterPoint {
  actual_date: string;
  delay_days: number;
  [key: string]: any;
}

const ScatterPlot: React.FC = () => {
  const { fileInfo, columns } = useData();
  const [scatterData, setScatterData] = useState<ScatterPoint[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [minDate, setMinDate] = useState<string>('');
  const [maxDate, setMaxDate] = useState<string>('');
  const [pendingFactor, setPendingFactor] = useState<string>('ALL');
  const [pendingFatorValue, setPendingFatorValue] = useState<string>('ALL');
  const [fatorValues, setFatorValues] = useState<string[]>([]);
  const [pendingStartDate, setPendingStartDate] = useState<string>('');
  const [pendingEndDate, setPendingEndDate] = useState<string>('');
  const [selectedFactor, setSelectedFactor] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (columns && columns.length > 0) {
      setAvailableColumns(columns.map(col => col.name).filter(name => name !== 'actual_date' && name !== 'delay_days'));
    }
  }, [columns]);

  useEffect(() => {
    if (fileInfo?.name) {
      api.post('/scatter-data', { fileId: fileInfo.fileId })
        .then(res => {
          setAvailableColumns((res.data.columns || []).filter((name: string) => name !== 'actual_date' && name !== 'delay_days' && name !== 'estimated_date'));
          setMinDate(res.data.min_date || '');
          setMaxDate(res.data.max_date || '');
          setPendingStartDate(res.data.min_date || '');
          setPendingEndDate(res.data.max_date || '');
        });
    }
  }, [fileInfo]);

  useEffect(() => {
    if (pendingFactor !== 'ALL' && pendingFactor) {
      api.post('/scatter-factor-values', {
        fileId: fileInfo?.name,
        fator: pendingFactor,
        dataInicio: pendingStartDate || undefined,
        dataFim: pendingEndDate || undefined,
      }).then(res => {
        setFatorValues(res.data.values || []);
        setPendingFatorValue('ALL');
      });
    } else {
      setFatorValues([]);
      setPendingFatorValue('ALL');
    }
  }, [pendingFactor, fileInfo, pendingStartDate, pendingEndDate]);

  const fetchScatterData = async () => {
    setLoading(true);
    try {
      let fatorValor = pendingFatorValue === 'ALL' ? undefined : pendingFatorValue;
      let fatorValorMin, fatorValorMax;
      if (pendingFactor !== 'ALL' && getIsNumeric(pendingFactor) && fatorValor !== undefined && fatorValor !== '') {
        const v = parseFloat(fatorValor);
        if (!isNaN(v)) {
          const delta = Math.max(1, v * 0.05);
          fatorValorMin = v - delta;
          fatorValorMax = v + delta;
        }
      }
      const res = await api.post('/scatter-data', {
        fileId: fileInfo.fileId,
        fator: pendingFactor === 'ALL' ? undefined : pendingFactor,
        fatorValor: (!getIsNumeric(pendingFactor) || fatorValorMin === undefined) ? (fatorValor === '' ? undefined : fatorValor) : undefined,
        fatorValorMin,
        fatorValorMax,
        dataInicio: pendingStartDate || undefined,
        dataFim: pendingEndDate || undefined,
        limit: 1000,
      });
      setScatterData(res.data.scatter || []);
      setSelectedFactor(pendingFactor);
      setStartDate(pendingStartDate);
      setEndDate(pendingEndDate);
    } catch (err) {
      setScatterData([]);
    } finally {
      setLoading(false);
    }
  };

  const getIsNumeric = (factorName: string) => {
    const col = columns.find(c => c.name === factorName);
    return col?.isNumeric === true;
  };

  const sortedScatterData = [...scatterData].sort((a, b) => new Date(a.actual_date).getTime() - new Date(b.actual_date).getTime());

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const point = payload[0].payload;
      const fatorKeys = Object.keys(point).filter(k => !['estimated_date', 'actual_date', 'delay_days'].includes(k));
      return (
        <div className="bg-white border rounded shadow p-2 text-xs">
          <div><b>Data Real:</b> {point.actual_date ? new Date(point.actual_date).toLocaleDateString('pt-BR') : '-'}</div>
          {fatorKeys.map((k) => (
            <div key={k}><b>{k}:</b> {point[k]}</div>
          ))}
          <div><b>Atraso (dias):</b> {point.delay_days}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <BarChart className="h-5 w-5 mr-2 text-primary" />
          Gráfico de Dispersão
        </CardTitle>
        <CardDescription>
          Visualize a relação entre os atrasos e os diferentes fatores do seu conjunto de dados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 items-end" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, auto))' }}>
          <div className="space-y-1 h-full flex flex-col justify-end">
            <label className="text-sm font-medium text-gray-700">Fator</label>
            <div className="mt-1">
              <Select value={pendingFactor} onValueChange={setPendingFactor}>
                <SelectTrigger className="h-9 text-base">
                  <SelectValue placeholder="Selecionar fator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Ver tudo</SelectItem>
                  {availableColumns
                    .filter(col => !getIsNumeric(col))
                    .map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1 h-full flex flex-col">
            <label className="text-sm font-medium text-gray-700">Valor do Fator</label>
            <div className="mt-1">
              <Select value={pendingFatorValue} onValueChange={setPendingFatorValue}>
                <SelectTrigger className="h-9 text-base">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {fatorValues.map(val => (
                    <SelectItem key={val} value={val}>{val}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1 h-full flex flex-col">
            <label className="text-sm font-medium text-gray-700">Período</label>
            <div className="mt-1 flex gap-2 min-w-0 w-full">
              <input
                type="date"
                value={pendingStartDate}
                min={minDate}
                max={pendingEndDate || maxDate}
                onChange={e => setPendingStartDate(e.target.value)}
                className="flex-1 min-w-0 rounded-md border border-input bg-background px-4 h-9 text-base"
              />
              <input
                type="date"
                value={pendingEndDate}
                min={pendingStartDate || minDate}
                max={maxDate}
                onChange={e => setPendingEndDate(e.target.value)}
                className="flex-1 min-w-0 rounded-md border border-input bg-background px-4 h-9 text-base"
              />
            </div>
          </div>
          <div className="space-y-1 h-full flex flex-col justify-end max-w-[200px]">
            <button
              onClick={fetchScatterData}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full sm:w-auto "
            >
              {loading ? 'Filtrando...' : 'Filtrar'}
            </button>
          </div>
        </div>
        <div className="w-full h-96 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid />
              <XAxis
                dataKey="actual_date"
                name="Data"
                tickFormatter={date => new Date(date).toLocaleDateString('pt-BR')}
                type="category"
              />
              <YAxis
                dataKey="delay_days"
                name="Atraso (dias)"
                type="number"
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter
                name={selectedFactor !== 'ALL' ? selectedFactor : 'Atraso'}
                data={sortedScatterData}
                fill="#2563eb"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        {loading && <div className="text-center mt-2">Carregando dados...</div>}
        {!loading && scatterData.length === 0 && <div className="text-center mt-2 text-muted-foreground">Nenhum dado encontrado para os filtros selecionados.</div>}
      </CardContent>
    </Card>
  );
};

export default ScatterPlot;
