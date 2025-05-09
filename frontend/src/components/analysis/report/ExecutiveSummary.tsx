import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface ExecutiveSummaryProps {
  rawDataLength: number;
  delayStatistics: {
    averageDelay: number;
    medianDelay: number;
    minDelay: number;
    maxDelay: number;
  };
  insights: string[];
}

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  rawDataLength,
  delayStatistics,
}) => {
  return (
    <div>
      <div className="p-4 rounded-lg bg-muted/30 text-sm space-y-2">
        <p>
          Esta análise é baseada em {rawDataLength} registros de entrega. O
          atraso médio na entrega é{" "}
          <strong
            className={
              delayStatistics.averageDelay > 0
                ? "text-red-500"
                : "text-green-500"
            }
          >
            {delayStatistics.averageDelay.toFixed(1)} dias
          </strong>
          .
        </p>

        {delayStatistics.averageDelay > 6 ? (
          <p className="flex items-start">
            <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <span>
              As entregas estão significativamente atrasadas em geral, sugerindo
              problemas sistêmicos no processo de entrega.
            </span>
          </p>
        ) : delayStatistics.averageDelay < -6 ? (
          <p className="flex items-start">
            <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
            <span>
              As entregas mostram pequenos atrasos em geral, com espaço para
              melhorias específicas.
            </span>
          </p>
        ) : (
          <p className="flex items-start">
            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
            <span>
              As entregas geralmente estão no prazo ou antecipadas, indicando um
              processo de entrega que funciona bem.
            </span>
          </p>
        )}
      </div>
    </div>
  );
};

export default ExecutiveSummary;
