import React, { useState } from "react";
import { useData } from "@/context/DataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { predictDelay, PredictRequest } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, CheckCircle2, ArrowRightCircle, BarChart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PredictionResult } from "@/lib/types";
import { Progress } from "@/components/ui/progress";

const PredictiveAnalysis: React.FC = () => {
  const { fileInfo } = useData();
  const { columns, rawData, analysisResult } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [factorValues, setFactorValues] = useState<Record<string, string>>({});
  const [predictionResult, setPredictionResult] =
    useState<PredictionResult | null>(null);

  const factorColumns = columns.filter((col) => col.role === "factor");

  const getUniqueValuesForFactor = (factorName: string) => {
    const uniqueValues = new Set<string>();

    rawData.forEach((row) => {
      uniqueValues.add(String(row[factorName]));
    });

    return Array.from(uniqueValues);
  };

  const handleFactorInputChange = (factorName: string, value: string) => {
    setFactorValues((prev) => ({ ...prev, [factorName]: value }));
  };

  const handlePredict = async () => {
    setIsLoading(true);

    try {
      const query: PredictRequest = {
        fileId: fileInfo?.fileId || "",
        data: rawData,
        columns: columns.map((col) => ({
          name: col.name,
          type: col.type,
          role: col.role,
        })),
        query: { ...factorValues, actual_date: new Date(date) },
      };

      columns.forEach((col) => {
        if (col.role === "factor" && col.isNumeric && factorValues[col.name]) {
          const v = parseFloat(factorValues[col.name]);
          if (!isNaN(v)) {
            const delta = Math.max(1, v * 0.05);
            query.query[`${col.name}_min`] = v - delta;
            query.query[`${col.name}_max`] = v + delta;
            delete query.query[col.name];
          }
        }
      });

      const result = await predictDelay(query);

      const formattedResult: PredictionResult = {
        predictedDelay: result.predictedDelay || 0,
        confidenceInterval: result.confidenceInterval || [0, 0],
        reliability: result.reliability || 0,
        similarCases: result.similarCases || 0,
        error: result.error,
      };
      setPredictionResult(formattedResult);
    } catch (error) {
      const errorResult: PredictionResult = {
        predictedDelay: 0,
        confidenceInterval: [0, 0] as [number, number],
        reliability: 0,
        similarCases: 0,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar a previsão",
      };
      setPredictionResult(errorResult);
    } finally {
      setIsLoading(false);
    }
  };

  const reliabilityColor = (reliability: number) => {
    if (reliability >= 0.7) return "bg-green-500";
    if (reliability >= 0.4) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-lg font-semibold">
            <BarChart className="h-5 w-5 mr-2 text-primary" />
            Análise Preditiva
          </CardTitle>
          <CardDescription>
            Insira parâmetros para prever atrasos de entrega para cenários
            específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Data de Entrega Planejada</Label>
                  <div className="mt-1">
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="input input-bordered w-full"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quando você espera que a entrega seja feita
                  </p>
                </div>

                {factorColumns.map((factor) => {
                  const isNumeric = factor.isNumeric === true;

                  return (
                    <div key={factor.name}>
                      <Label className="text-sm">{factor.label}</Label>
                      {isNumeric ? (
                        <Input
                          type="number"
                          placeholder={`Digite um valor para ${factor.label}`}
                          className="mt-1"
                          value={factorValues[factor.name] || ""}
                          onChange={(e) =>
                            handleFactorInputChange(factor.name, e.target.value)
                          }
                        />
                      ) : (
                        <Select
                          value={factorValues[factor.name] || ""}
                          onValueChange={(value) =>
                            handleFactorInputChange(factor.name, value)
                          }
                        >
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue
                              placeholder={`Selecione ${factor.label}`}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {getUniqueValuesForFactor(factor.name).map(
                              (value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}

                <Button
                  className="w-full mt-2"
                  onClick={handlePredict}
                  disabled={isLoading || !date}
                >
                  {isLoading ? (
                    <>Analisando...</>
                  ) : (
                    <>
                      <ArrowRightCircle className="mr-2 h-4 w-4" />
                      Prever Atraso
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div>
              {predictionResult?.error ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-md">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    <p>{predictionResult.error}</p>
                  </div>
                </div>
              ) : predictionResult ? (
                <div className="h-full flex flex-col">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-2">
                      <Clock className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">
                      Resultados da Previsão
                    </h3>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold">
                        {predictionResult.predictedDelay > 0 ? (
                          <span className="text-red-500">
                            +{predictionResult.predictedDelay.toFixed(1)} dias
                          </span>
                        ) : predictionResult.predictedDelay < 0 ? (
                          <span className="text-green-500">
                            {predictionResult.predictedDelay.toFixed(1)} dias
                          </span>
                        ) : (
                          <span>No prazo</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {predictionResult.predictedDelay > 0
                          ? "Atraso esperado"
                          : predictionResult.predictedDelay < 0
                          ? "Chegada antecipada esperada"
                          : "Espera-se que chegue no prazo"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Intervalo de Confiança</span>
                        <span className="font-medium">
                          {predictionResult.confidenceInterval[0].toFixed(1)} a{" "}
                          {predictionResult.confidenceInterval[1].toFixed(1)}{" "}
                          dias
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span>Baseado em Casos Similares</span>
                        <span className="font-medium">
                          {predictionResult.similarCases}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Confiabilidade da Previsão</span>
                          <span className="font-medium">
                            {(predictionResult.reliability * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress
                          value={predictionResult.reliability * 100}
                          className={cn(
                            "h-2",
                            reliabilityColor(predictionResult.reliability)
                          )}
                        />
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-md p-3 text-sm">
                      <div className="flex">
                        {predictionResult.reliability >= 0.7 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
                        )}
                        <p>
                          {predictionResult.reliability >= 0.7
                            ? "Esta previsão é altamente confiável com base em casos semelhantes suficientes em seus dados."
                            : "Esta previsão tem confiabilidade limitada devido a poucos casos semelhantes em seus dados."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-lg border-muted-foreground/20">
                  <BarChart className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Nenhuma Previsão Ainda
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Preencha os parâmetros à esquerda e clique em "Prever
                    Atraso" para gerar uma previsão de entrega com base em seus
                    dados.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t px-6 py-4">
          <div className="text-sm text-muted-foreground">
            <p className="flex items-center">
              <InfoIcon className="h-4 w-4 mr-2 text-primary" />O algoritmo de
              previsão analisa seus dados históricos para encontrar cenários
              semelhantes e calcular atrasos esperados.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

const InfoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

export default PredictiveAnalysis;
