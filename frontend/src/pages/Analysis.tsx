import React from "react";
import { useData } from "@/context/DataContext";
import { useNavigate } from "react-router-dom";
import Dashboard from "@/components/analysis/dashboard";
import PredictiveAnalysis from "@/components/analysis/PredictiveAnalysis";
import DetailedReport from "@/components/analysis/report";
import MainLayout from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, LineChart, FileText, ArrowLeft } from "lucide-react";
import { useEffect } from "react";

const Analysis: React.FC = () => {
  const { analysisResult } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!analysisResult) {
      navigate("/");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [analysisResult, navigate]);

  if (!analysisResult) return null;

  return (
    <MainLayout className="mb-8">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="mb-2 hover:-translate-x-1 transition-transform"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar aos Dados
            </Button>
            <h1 className="text-3xl font-bold tracking-tight mb-1">
              Resultados da Análise
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg">
              Explore insights detalhados sobre suas entregas, faça previsões e
              revise relatórios completos
            </p>
          </div>
        </div>
        <Tabs defaultValue="dashboard" className="w-full animate-fade-in">
          <TabsList className="grid w-full md:w-auto grid-cols-3 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="predictive" className="flex items-center">
              <LineChart className="h-4 w-4 mr-2" />
              <span>Previsões</span>
            </TabsTrigger>
            <TabsTrigger value="report" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              <span>Relatório</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-0 animate-slide-in">
            <Dashboard />
          </TabsContent>
          <TabsContent
            value="predictive"
            className="mt-0 animate-slide-in animate-delay-100"
          >
            <PredictiveAnalysis />
          </TabsContent>
          <TabsContent
            value="report"
            className="mt-0 animate-slide-in animate-delay-200"
          >
            <DetailedReport />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Analysis;
