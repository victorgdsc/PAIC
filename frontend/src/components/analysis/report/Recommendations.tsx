import React from "react";
import { FactorAnalysis as FactorAnalysisType } from "@/lib/types";

interface RecommendationsProps {
  delayStatistics: {
    averageDelay: number;
    medianDelay: number;
    minDelay: number;
    maxDelay: number;
  };
  factorAnalysis: FactorAnalysisType[];
}

const Recommendations: React.FC<RecommendationsProps> = ({
  delayStatistics,
  factorAnalysis,
}) => {
  const topFactors = factorAnalysis.flatMap((factor) =>
    factor.values.map((value) => ({
      factor: factor.factor,
      value: value.value,
      percentDifference: value.percentDifference,
      averageDelay: value.averageDelay,
    }))
  );

  const criticalLate = topFactors.filter((f) => f.averageDelay > 2);
  const criticalEarly = topFactors.filter((f) => f.averageDelay < -2);

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Recomendações</h3>
      <div className="space-y-3">
        {criticalLate.length > 0 && (
          <div className="p-3 border-l-4 border-red-500 bg-red-500/5 rounded-r-md">
            <h4 className="font-medium">Tratar Atrasos Críticos</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {`Priorize ações para ${criticalLate
                .map((f) => `${f.factor} "${f.value}"`)
                .join(" e ")}, pois apresentam atrasos médios significativos.`}
            </p>
          </div>
        )}
        {criticalEarly.length > 0 && (
          <div className="p-3 border-l-4 border-blue-700 bg-blue-200/40 rounded-r-md">
            <h4 className="font-medium">Evitar Adiantamentos Excessivos</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {`Atenção para ${criticalEarly
                .map((f) => `${f.factor} "${f.value}"`)
                .join(
                  " e "
                )}, pois apresentam entregas muito adiantadas, o que pode indicar falhas de planejamento ou desperdício de recursos.`}
            </p>
          </div>
        )}
        {criticalLate.length === 0 && criticalEarly.length === 0 && (
          <div className="p-3 border-l-4 border-green-500 bg-green-500/5 rounded-r-md">
            <h4 className="font-medium">Processos sob Controle</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Não foram identificados fatores críticos de atraso ou adiantamento
              extremo neste relatório.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
