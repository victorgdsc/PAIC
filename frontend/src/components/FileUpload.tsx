import React, { useCallback, useState, useEffect } from "react";
import { Upload ,  FileSpreadsheet,  X,  CheckCircle2 ,  Info ,  ChevronDown , ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-helpers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import ColumnNumericToggle from "./ColumnNumericToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TEST_CONFIG } from "@/config/testConfig";

const FileUpload: React.FC = () => {
  const {
    handleFileUpload,
    fileInfo,
    isLoading,
    resetData,
    dataStats,
    columns,
    updateColumnNumeric,
  } = useData();
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showNumericOptions, setShowNumericOptions] = useState(false);
  const [localFile, setLocalFile] = useState<File | null>(null);

  const validateFile = (file: File): boolean => {
    const fileType = file.name.split(".").pop()?.toLowerCase() || "";
    const validTypes = ["csv", "xls", "xlsx"];
    if (!validTypes.includes(fileType)) {
      toast.error(
        "Formato de arquivo não suportado. Por favor, use arquivos CSV ou Excel."
      );
      return false;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.warning(
        "Este arquivo é extremamente grande (>500MB). O processamento pode levar muito tempo e consumir bastante memória."
      );
    } else if (file.size > 100 * 1024 * 1024) {
      toast.warning(
        "Este arquivo é grande (>100MB). O processamento pode levar algum tempo."
      );
    }
    return true;
  };

  useEffect(() => {
    if (TEST_CONFIG.AUTO_UPLOAD_ENABLED) {
      const fetchAndUpload = async () => {
        try {
          const response = await fetch(TEST_CONFIG.SAMPLE_FILE_PATH);
          const blob = await response.blob();
          const file = new File([blob], TEST_CONFIG.SAMPLE_FILE_NAME, {
            type: "text/csv",
          });
          await handleFileUpload(file);
        } catch (err) {
        }
      };
      fetchAndUpload();
    }
  }, []);

  const simulateUploadProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (validateFile(file)) {
          simulateUploadProgress();
          handleFileUpload(file);
        }
      }
    },
    [handleFileUpload]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dragActive) setDragActive(true);
    },
    [dragActive]
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setLocalFile(file);
        simulateUploadProgress();
      }
    }
  }, []);

  const handleConfirmUpload = useCallback(() => {
    if (localFile) {
      handleFileUpload(localFile);
      setLocalFile(null);
    }
  }, [localFile, handleFileUpload]);

  const handleToggleNumeric = (columnName: string, isNumeric: boolean) => {
    updateColumnNumeric(columnName, isNumeric);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
    else return (bytes / 1073741824).toFixed(1) + " GB";
  };

  const handleButtonClick = () => {
    document.getElementById("file-upload")?.click();
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {!fileInfo ? (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-12 text-center transition-all",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/20 hover:border-muted-foreground/30 bg-muted/10"
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={onFileChange}
            accept=".csv,.xls,.xlsx"
            disabled={isLoading}
          />

          <div className="flex flex-col items-center w-full">
            <div
              className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3 cursor-pointer"
              onClick={handleButtonClick}
            >
              <Upload
                size={28}
                className={cn(
                  "text-muted-foreground transition-all",
                  dragActive && "text-primary scale-110"
                )}
              />
            </div>
            <h3 className="text-lg font-medium mb-2">
              Carregue seu arquivo de dados
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs mb-6 text-center">
              Arraste e solte seu arquivo CSV ou Excel aqui, ou clique no botão
              abaixo
            </p>
            <Button
              type="button"
              className="mt-2"
              disabled={isLoading}
              onClick={handleButtonClick}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {isLoading ? "Carregando..." : "Selecionar arquivo CSV ou Excel"}
            </Button>

            <div className="mt-6 text-xs text-muted-foreground w-full">
              <p className="mb-1 text-center">
                Arquivo completo: Os dados serão carregados integralmente.
              </p>
              <p className="mb-1 text-center">
                Arquivos grandes (&gt;100MB): O processamento pode levar mais
                tempo.
              </p>
              <p className="mb-2 text-center">
                Arquivos muito grandes (&gt;500MB): Pode haver lentidão
                dependendo da memória disponível.
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-2">
                Carregando arquivo... {uploadProgress}%
              </p>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Arquivo Carregado</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetData}
              disabled={isLoading}
              className="h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Remover
            </Button>
          </div>

          <div className="flex items-center p-3 bg-muted/50 rounded-md mb-4">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mr-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{fileInfo.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(fileInfo.size)}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-green-500 ml-2" />
          </div>

          {dataStats && (
            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Arquivo carregado com sucesso! Total de{" "}
                {dataStats.totalRows.toLocaleString()} linhas carregadas para
                análise.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground">
            <p>
              Seu arquivo foi carregado com sucesso. Agora você pode prosseguir
              para o próximo passo para mapear as colunas de dados.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
