import React from "react";
import { useData } from "@/context/DataContext";
import FileUpload from "@/components/FileUpload";
import ColumnMapping from "@/components/ColumnMapping";
import MainLayout from "@/components/layout/MainLayout";
import { BarChart3, ArrowRightCircle, Upload, FileHeart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index: React.FC = () => {
  const { fileInfo, analysisResult } = useData();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = React.useState<'upload' | 'mapping' | 'analysis'>(!fileInfo ? 'upload' : !analysisResult ? 'mapping' : 'analysis');

  const goToAnalysis = () => {
    setActiveStep('analysis');
    navigate("/analysis");
  };

  const handleUploadSuccess = () => {
    setActiveStep('mapping');
  };

  return (
    <MainLayout>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10 animate-fade-in">
          <div className="flex justify-center">
            <BarChart3 className="h-16 w-16 text-primary mx-auto mb-4 transform -rotate-3 drop-shadow-sm" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">PAIC</h1>
          <p className="text-xl text-muted-foreground mt-1 max-w-xl mx-auto font-light">
            Sistema de Análise de Entregas
          </p>
        </div>

        <div className="mb-12">
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dashed"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 py-1 rounded-full text-muted-foreground font-medium">
                {fileInfo ? "Processamento de Dados" : "Vamos começar!"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-sm text-muted-foreground mb-8">
            <div
              className={`p-5 rounded-lg shadow-sm transition-all duration-300 ${
                !fileInfo
                  ? "bg-primary/5 border-primary/20 border"
                  : "hover:bg-slate-50"
              }`}
            >
              <Upload
                className={`h-6 w-6 mx-auto mb-3 ${
                  !fileInfo ? "text-primary" : "text-muted-foreground/50"
                }`}
              />
              <p
                className={`font-medium ${!fileInfo ? "text-foreground" : ""}`}
              >
                Carregar Seus Dados
              </p>
              <p className="text-xs mt-1 italic">Formato CSV ou Excel</p>
            </div>

            <div
              className={`p-5 rounded-lg shadow-sm transition-all duration-300 ${
                fileInfo && !analysisResult
                  ? "bg-primary/5 border-primary/20 border"
                  : "hover:bg-slate-50"
              }`}
            >
              <ArrowRightCircle
                className={`h-6 w-6 mx-auto mb-3 ${
                  fileInfo && !analysisResult
                    ? "text-primary"
                    : "text-muted-foreground/50"
                }`}
              />
              <p
                className={`font-medium ${
                  fileInfo && !analysisResult ? "text-foreground" : ""
                }`}
              >
                Mapear Colunas
              </p>
              <p className="text-xs mt-1 italic">
                Identificar campos importantes
              </p>
            </div>

            <div
              className={`p-5 rounded-lg shadow-sm transition-all duration-300 ${
                analysisResult
                  ? "bg-primary/5 border-primary/20 border"
                  : "hover:bg-slate-50"
              }`}
            >
              <FileHeart
                className={`h-6 w-6 mx-auto mb-3 ${
                  analysisResult ? "text-primary" : "text-muted-foreground/50"
                }`}
              />
              <p
                className={`font-medium ${
                  analysisResult ? "text-foreground" : ""
                }`}
              >
                Ver Análise
              </p>
              <p className="text-xs mt-1 italic">
                Explorar insights e previsões
              </p>
            </div>
          </div>
        </div>

        <div className="animate-slide-in">
          {activeStep === 'upload' && <FileUpload onSuccess={handleUploadSuccess} />}
          {activeStep === 'mapping' && <ColumnMapping />}
        </div>

        {analysisResult && (
          <div className="flex justify-center mt-10">
            <Button
              onClick={goToAnalysis}
              className="px-8 py-6 hover:scale-[1.02] transition-all font-medium"
            >
              Ver Análise Detalhada
              <ArrowRightCircle className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Index;
