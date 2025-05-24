import React, { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileSpreadsheet, X, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { uploadCSVFromDriveLink } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-helpers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { TEST_CONFIG, type ExampleFile } from "@/config/testConfig";

interface FileUploadProps {
  onSuccess?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL;

const FileUpload: React.FC<FileUploadProps> = ({ onSuccess }) => {
  const {
    handleFileUpload,
    fileInfo,
    isLoading,
    resetData,
    dataStats,
    setColumns,
    setAllColumns,
    setFileInfo,
    setRawData,
  } = useData();
  
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadLargeFileToGCS = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const resUrl = await fetch(
        `${API_URL}/api/generate-upload-url`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_name: file.name })
        }
      );
      if (!resUrl.ok) throw new Error('Erro ao obter URL de upload');
      const { url } = await resUrl.json();

      const uploadRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Erro ao fazer upload para o GCS');

      const notifyRes = await fetch(
        `${API_URL}/api/notify-upload-complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_name: file.name })
        }
      );
      const notifyMsg = await notifyRes.json();
      if (notifyMsg.columns) {
        setColumns(notifyMsg.columns.map((col: string) => ({
          name: col,
          role: undefined,
          isNumeric: false,
          originalName: col
        })));
        setAllColumns(notifyMsg.columns.map((col: string) => ({
          name: col,
          role: undefined,
          isNumeric: false,
          originalName: col
        })));
      }
      toast.success(notifyMsg.message || 'Upload e notificação concluídos!');
      if (typeof setFileInfo === 'function') setFileInfo({
        name: file.name,
        type: file.type,
        size: file.size,
        fileId: file.name,
        totalRows: undefined,
        isPartialData: false,
      });
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error?.message || 'Erro no upload grande');
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

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

  const navigate = useNavigate();

  const getUserId = () => {
    return localStorage.getItem('user_id') || 'demo-user';
  };

  const handleExampleSelect = async (exampleFile: ExampleFile) => {
    try {
      setIsUploading(true);
      setSelectedExample(exampleFile.id);

      let columns: string[] = [];
      if (!exampleFile.columns) {
        const columnsRes = await fetch(`${API_URL}/api/get-columns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: exampleFile.path })
        });
        if (columnsRes.ok) {
          const columnsData = await columnsRes.json();
          columns = columnsData.columns || [];
        }
      } else {
        columns = exampleFile.columns as string[];
      }
      const copyData = {
        columns,
        fileId: exampleFile.path
      };
      if (copyData.columns) {
        let mappedColumns = copyData.columns.map((col: string) => {
          let role: string | undefined = undefined;
          let isNumeric = false;
          if (exampleFile.columnMapping && exampleFile.columnMapping[col]) {
            role = exampleFile.columnMapping[col];
          }
          if (exampleFile.numericColumns && exampleFile.numericColumns.includes(col)) {
            isNumeric = true;
          }
          return {
            name: col,
            role,
            isNumeric,
            originalName: col
          };
        });
        setColumns(mappedColumns);
        setAllColumns(mappedColumns);
      }
      const newBlobName = copyData.fileId;

      if (typeof setFileInfo === 'function') setFileInfo({
        name: exampleFile.name,
        type: 'text/csv',
        size: 0,
        fileId: newBlobName,
        totalRows: undefined,
        isPartialData: false,
      });
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar arquivo de exemplo.');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

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
          uploadLargeFileToGCS(file);
        }
      }
    },
    []
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
        simulateUploadProgress();
        uploadLargeFileToGCS(file).then(() => {
          if (onSuccess) onSuccess();
        });
      }
    }
  }, [onSuccess]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  };

  const handleButtonClick = () => {
    document.getElementById("file-upload")?.click();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Arquivos de Exemplo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEST_CONFIG.EXAMPLE_FILES.map((example) => (
            <Card 
              key={example.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary hover:shadow-md h-full flex flex-col",
                selectedExample === example.id ? "border-primary border-2" : ""
              )}
              onClick={() => handleExampleSelect(example)}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{example.name}</CardTitle>
                  {selectedExample === example.id && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <CardDescription className="text-xs">
                  {example.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="p-4 pt-0 mt-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  disabled={isUploading && selectedExample === example.id}
                >
                  {isUploading && selectedExample === example.id ? (
                    <>
                      <div className="h-4 w-4 mr-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    'Selecionar'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Ou faça upload de um arquivo
          </span>
        </div>
      </div>

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
              Arraste e solte seu arquivo CSV ou Excel aqui, ou clique no botão abaixo
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
                Arquivos grandes (&gt;100MB): O processamento pode levar mais tempo.
              </p>
              <p className="mb-2 text-center">
                Arquivos muito grandes (&gt;500MB): Pode haver lentidão dependendo da memória disponível.
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
