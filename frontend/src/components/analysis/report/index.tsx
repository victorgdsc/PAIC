import React from 'react';
import { useData } from '@/context/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ExecutiveSummary from './ExecutiveSummary';
import DeliveryStatusBreakdown from './DeliveryStatusBreakdown';
import CriticalFactors from './CriticalFactors';
import Recommendations from './Recommendations';
import { FileTextIcon } from './Icons';

const DetailedReport: React.FC = () => {
  const { analysisResult } = useData();

  if (!analysisResult) {
    return <div>Nenhum resultado de análise disponível</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <FileTextIcon className="h-5 w-5 mr-2 text-primary" />
            Relatório de Desempenho de Entregas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <ExecutiveSummary
              rawDataLength={useData().rawData.length}
              delayStatistics={analysisResult.delayStatistics}
              insights={analysisResult.insights}
            />
            <DeliveryStatusBreakdown />
            <CriticalFactors factorAnalysis={analysisResult.factorAnalysis} />
            <Recommendations
              delayStatistics={analysisResult.delayStatistics}
              factorAnalysis={analysisResult.factorAnalysis}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailedReport;
