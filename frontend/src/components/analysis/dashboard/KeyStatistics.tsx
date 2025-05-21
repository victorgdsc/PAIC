import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, TrendingUp, AlertTriangle, Truck } from "lucide-react";

interface KeyStatisticsProps {
  delayStatistics: {
    averageDelay: number;
    medianDelay: number;
    minDelay: number;
    maxDelay: number;
  };
  trend?: "increasing" | "decreasing" | "stable";
}

const KeyStatistics: React.FC<KeyStatisticsProps> = ({
  delayStatistics,
  trend,
}) => {
  const getDelayColor = (delay: number) => {
    if (delay <= 0) return "text-green-500";
    if (delay <= 2) return "text-amber-500";
    return "text-red-500";
  };

  const translateTrend = (trend: string | undefined) => {
    if (trend === "increasing") return "Aumentando";
    if (trend === "decreasing") return "Diminuindo";
    return "Estável";
  };

  const getTrendColor = (trend: string | undefined) => {
    if (trend === "increasing") return "text-red-500";
    if (trend === "decreasing") return "text-green-500";
    return "text-amber-500";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Atraso Médio
              </p>
              <div
                className={`text-2xl font-bold flex items-center ${getDelayColor(
                  delayStatistics.averageDelay
                )}`}
              >
                {delayStatistics.averageDelay.toFixed(1)} dias
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Atraso Mediano
              </p>
              <div
                className={`text-2xl font-bold flex items-center ${getDelayColor(
                  delayStatistics.medianDelay
                )}`}
              >
                {delayStatistics.medianDelay.toFixed(1)} dias
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Atraso Máximo
              </p>
              <div
                className={`text-2xl font-bold flex items-center ${getDelayColor(
                  delayStatistics.maxDelay
                )}`}
              >
                {delayStatistics.maxDelay.toFixed(1)} dias
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Tendência
              </p>
              <div className="text-2xl font-bold flex items-center">
                <span className={getTrendColor(trend)}>
                  {translateTrend(trend)}
                </span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeyStatistics;
