import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart4, Clock, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FactorAnalysis as FactorAnalysisType } from '@/lib/types';

interface CriticalFactorsProps {
  factorAnalysis: FactorAnalysisType[];
}

const CriticalFactors: React.FC<CriticalFactorsProps> = ({
  factorAnalysis,
}) => {
  const [viewMode, setViewMode] = useState<"late" | "early">("late");

  const lateFactors = factorAnalysis
    .flatMap((factor) =>
      factor.values.map((value) => ({
        factor: factor.factor,
        value: value.value,
        averageDelay: value.averageDelay,
        percentDifference: value.percentDifference,
        count: value.count,
      }))
    )
    .filter((f) => f.averageDelay > 0)
    .sort((a, b) => b.averageDelay - a.averageDelay)
    .slice(0, 12);

  const earlyFactors = factorAnalysis
    .flatMap((factor) =>
      factor.values.map((value) => ({
        factor: factor.factor,
        value: value.value,
        averageDelay: value.averageDelay,
        percentDifference: value.percentDifference,
        count: value.count,
      }))
    )
    .filter((f) => f.averageDelay < 0)
    .sort((a, b) => a.averageDelay - b.averageDelay)
    .slice(0, 12);

  const displayedFactors = viewMode === "late" ? lateFactors : earlyFactors;

  const totalFactors = displayedFactors.length;
  const avgDelay =
    displayedFactors.reduce((acc, f) => acc + f.averageDelay, 0) /
    (displayedFactors.length || 1);
  const maxDelay = Math.max(
    ...displayedFactors.map((f) => Math.abs(f.averageDelay))
  );
  const minDelay =
    displayedFactors.length > 0
      ? Math.min(...displayedFactors.map((f) => Math.abs(f.averageDelay)))
      : 0;

  function getImpactColor(averageDelay: number) {
    if (averageDelay >= 7) return "bg-red-100 border-red-400";
    if (averageDelay >= 4) return "bg-orange-100 border-orange-400";
    if (averageDelay >= 2) return "bg-yellow-100 border-yellow-400";
    if (averageDelay > -1) return "bg-green-50 border-green-400";
    if (averageDelay <= -3) return "bg-blue-200 border-blue-500";
    return "bg-blue-50 border-blue-300";
  }

  function getImpactMessage(averageDelay: number) {
    if (averageDelay >= 2)
      return "Este fator está associado a atrasos nas entregas.";
    if (averageDelay > -1)
      return "Este fator está associado a entregas próximas ao prazo estimado.";
    if (averageDelay <= -3)
      return "Este fator está associado a entregas muito adiantadas, o que pode indicar problemas de planejamento ou estoque.";
    return "Este fator está associado a entregas adiantadas.";
  }

  function getContextIcon(averageDelay: number) {
    if (averageDelay >= 4)
      return <BarChart4 className="h-5 w-5 text-red-500 mr-2" />;
    if (averageDelay >= 2)
      return <BarChart4 className="h-5 w-5 text-orange-500 mr-2" />;
    if (averageDelay > -1)
      return <BarChart4 className="h-5 w-5 text-green-600 mr-2" />;
    if (averageDelay <= -3)
      return <BarChart4 className="h-5 w-5 text-blue-700 mr-2" />;
    return <BarChart4 className="h-5 w-5 text-blue-400 mr-2" />;
  }

  return (
    <>
      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg font-bold">
            <BarChart4 className="h-5 w-5 mr-2 text-primary" />
            Fatores Críticos que Afetam as Entregas
          </CardTitle>
          <CardDescription>
            Lista ampliada de fatores e valores que impactam o desempenho das
            entregas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={viewMode === "late" ? "default" : "outline"}
              onClick={() => setViewMode("late")}
            >
              Atrasados
            </Button>
            <Button
              variant={viewMode === "early" ? "default" : "outline"}
              onClick={() => setViewMode("early")}
            >
              Adiantados
            </Button>
          </div>
          <div className="mb-4 text-sm text-muted-foreground">
            <p>
              Abaixo estão os fatores e valores identificados que impactam o
              desempenho das entregas (
              {viewMode === "late" ? "atrasadas" : "adiantadas"}).
            </p>
            <p className="mt-1">
              Total de combinações exibidas:{" "}
              <strong>{displayedFactors.length}</strong>
            </p>
            <p>
              Média de atraso entre todos os fatores:{" "}
              <strong>{avgDelay.toFixed(2)} dias</strong> | Mínimo:{" "}
              <strong>{minDelay.toFixed(2)} dias</strong> | Máximo:{" "}
              <strong>{maxDelay.toFixed(2)} dias</strong>
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedFactors.map((factor, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border shadow-sm flex flex-col ${getImpactColor(
                  factor.averageDelay
                )} ${index % 2 === 0 ? "rotate-[0.3deg]" : "rotate-[-0.2deg]"}`}
              >
                <div className="flex items-center mb-2">
                  {getContextIcon(factor.averageDelay)}
                  <span className="font-medium text-base">{factor.factor}</span>
                </div>
                <div className="mb-1 text-lg font-semibold">{factor.value}</div>
                <div className="flex flex-wrap gap-4 mb-2">
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                    <span>
                      Atraso Médio:{" "}
                      <strong>{factor.averageDelay.toFixed(1)} dias</strong>
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Layers className="h-4 w-4 text-muted-foreground mr-1" />
                    <span>
                      Tamanho da Amostra: <strong>{factor.count}</strong>
                    </span>
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  <p>{getImpactMessage(factor.averageDelay)}</p>
                </div>
              </div>
            ))}
            {displayedFactors.length === 0 && (
              <div className="text-center py-6 text-muted-foreground col-span-full">
                Não foram encontrados fatores significativos para este critério.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default CriticalFactors;
