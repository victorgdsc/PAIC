import React from "react";
import { useData } from "@/context/DataContext";
import KeyStatistics from "./KeyStatistics";
import SeasonalityForecast from "./SeasonalityForecast";
import ScatterPlot from "./ScatterPlot";
import AdvancedParetoChart from "./AdvancedParetoChart";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard: React.FC = () => {
  const { analysisResult, isLoading, fileInfo } = useData();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-40" />
        <Skeleton className="h-80" />
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="flex items-center justify-center h-full p-8 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">
          Nenhum dado para exibir. Carregue um arquivo e execute a análise
          primeiro.
        </p>
      </div>
    );
  }

  const safeDelayStatistics = analysisResult.delayStatistics ?? {
    averageDelay: 0,
    medianDelay: 0,
    minDelay: 0,
    maxDelay: 0,
  };

  return (
    <div className="space-y-6">
      <KeyStatistics
        delayStatistics={safeDelayStatistics}
        trend={analysisResult.timeSeriesAnalysis?.trend}
      />
      <ScatterPlot />
      <SeasonalityForecast />
      <AdvancedParetoChart fileId={fileInfo?.fileId ?? ""} />
    </div>
  );
};

export default Dashboard;
