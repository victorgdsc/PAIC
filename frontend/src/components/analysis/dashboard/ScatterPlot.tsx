import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SelectAuto from './SelectAuto';
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
    if (fileInfo?.fileId) {
      api.post('/api/scatter-data', { fileId: fileInfo.fileId, onlyMeta: true })
        .then(res => {
          setAvailableColumns(
            (res.data.columns || []).filter((name: string) => {
              const column = columns.find((col) => col.name === name);
              return (
                !column?.isNumeric &&
                name !== "actual_date" &&
                name !== "delay_days" &&
                name !== "estimated_date"
              );
            })
          );
          setMinDate(res.data.min_date || '');
          setMaxDate(res.data.max_date || '');
          setPendingStartDate(res.data.min_date || '');
          setPendingEndDate(res.data.max_date || '');
        });
    }
  }, [fileInfo, columns]);

  useEffect(() => {
    if (pendingFactor !== 'ALL' && pendingFactor) {
      api.post('/api/scatter-factor-values', {
        fileId: fileInfo?.fileId,
        fator: pendingFactor,
        dataInicio: pendingStartDate || undefined,
        dataFim: pendingEndDate || undefined,
      }).then(res => {
        const valoresDoFator = res.data.factors?.[pendingFactor] || [];
        setFatorValues(valoresDoFator);
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
      const res = await api.post('/api/scatter-data', {
        fileId: fileInfo.fileId,
        fator: pendingFactor === 'ALL' ? undefined : pendingFactor,
        fatorValor: (!getIsNumeric(pendingFactor) || fatorValorMin === undefined) ? (fatorValor === '' ? undefined : fatorValor) : undefined,
        fatorValorMin,
        fatorValorMax,
        dataInicio: pendingStartDate || undefined,
        dataFim: pendingEndDate || undefined,
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

  let xDates = sortedScatterData.map(d => d.actual_date);
  let xUniqueDates = Array.from(new Set(xDates));
  let maxTicks = 10;
  let tickvals: string[] = [];
  let ticktext: string[] = [];
  if (xUniqueDates.length > maxTicks) {
    let step = Math.ceil(xUniqueDates.length / maxTicks);
    for (let i = 0; i < xUniqueDates.length; i += step) {
      tickvals.push(xUniqueDates[i]);
      ticktext.push(new Date(xUniqueDates[i]).toLocaleDateString('pt-BR'));
    }
    if (tickvals[tickvals.length - 1] !== xUniqueDates[xUniqueDates.length - 1]) {
      tickvals.push(xUniqueDates[xUniqueDates.length - 1]);
      ticktext.push(new Date(xUniqueDates[xUniqueDates.length - 1]).toLocaleDateString('pt-BR'));
    }
  } else {
    tickvals = xUniqueDates;
    ticktext = xUniqueDates.map(date => new Date(date).toLocaleDateString('pt-BR'));
  }

  const plotlyData = [
    {
      x: sortedScatterData.map(d => d.actual_date),
      y: sortedScatterData.map(d => d.delay_days),
      mode: 'markers',
      type: 'scattergl',
      marker: { color: '#2563eb', size: 7, opacity: 0.7 },
      customdata: sortedScatterData.map(d => {
        const fatorKeys = Object.keys(d).filter(k => !['estimated_date', 'actual_date', 'delay_days'].includes(k));
        return [
          d.actual_date ? new Date(d.actual_date).toLocaleDateString('pt-BR') : '-',
          ...fatorKeys.map(k => `${k}: ${d[k]}`),
          d.delay_days
        ];
      }),
      hovertemplate: (() => {
        const fatorKeys = sortedScatterData.length > 0 ? Object.keys(sortedScatterData[0]).filter(k => !['estimated_date', 'actual_date', 'delay_days'].includes(k)) : [];
        let template = 'Data Real: %{customdata[0]}<br>';
        fatorKeys.forEach((_, i) => {
          template += `%{customdata[${i+1}]}<br>`;
        });
        template += 'Atraso/Adiantamento: %{customdata[' + (fatorKeys.length+1) + ']}<extra></extra>';
        return template;
      })(),
      name: selectedFactor !== 'ALL' ? selectedFactor : 'Atraso',
    }
  ];

  const layout = {
    title: 'Gráfico de Dispersão (Plotly)',
    xaxis: {
      title: 'Data',
      type: 'category',
      tickvals: tickvals,
      ticktext: ticktext,
      automargin: true,
    },
    yaxis: {
      title: 'Atraso (dias)',
      automargin: true,
      zeroline: false,
    },
    legend: { orientation: 'h', y: -0.2 },
    hovermode: 'closest',
    margin: { t: 50, l: 60, r: 30, b: 60 },
    autosize: true,
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
              <SelectAuto
                value={pendingFactor || null}
                onChange={setPendingFactor}
                options={[{ value: "ALL", label: "Todos" }, ...availableColumns.map(col => ({ value: col, label: col }))]}
                placeholder="Selecionar fator"
              />
            </div>
          </div>
          <div className="space-y-1 h-full flex flex-col">
            <label className="text-sm font-medium text-gray-700">Valor do Fator</label>
            <div className="mt-1">
              <SelectAuto
                value={pendingFatorValue}
                onChange={setPendingFatorValue}
                options={[{ value: "ALL", label: "Todos" }, ...fatorValues.map(val => ({ value: val, label: val }))]}
                placeholder="Todos"
              />
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
          <Plot
            data={plotlyData}
            layout={layout}
            config={{ responsive: true, displayModeBar: true }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler
          />
        </div>
        {loading && <div className="text-center mt-2">Carregando dados...</div>}
        {!loading && scatterData.length === 0 && <div className="text-center mt-2 text-muted-foreground">Nenhum dado encontrado para os filtros selecionados.</div>}
      </CardContent>
    </Card>
  );
};

export default ScatterPlot;
