import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from "react";
import { DataRow, DataColumn, AnalysisResult, DataStats } from "@/lib/types";
import { toast } from "@/lib/toast-helpers";
import { parseFile, getChunk } from "@/lib/api";

type AnalysisModel = "regression" | "arima" | "auto";

interface ParseFileResponse {
  columns: DataColumn[];
  chunked: boolean;
  fileId: string;
  autoDetected?: boolean;
}

interface DataProviderProps {
  children: ReactNode;
}
const API_URL = import.meta.env.VITE_API_URL;

interface DataContextType {
  rawData: DataRow[];
  columns: DataColumn[];
  analysisResult: AnalysisResult | null;
  isLoading: boolean;
  fileInfo: {
    name: string;
    type: string;
    size: number;
    fileId?: string;
  } | null;
  dataStats: DataStats | null;
  currentPage: number;
  pageSize: number;
  totalRows: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  handleFileUpload: (file: File) => Promise<void>;
  updateColumnRole: (
    columnName: string,
    role: "estimatedDate" | "actualDate" | "factor" | "delay" | undefined
  ) => void;
  updateColumnNumeric: (columnName: string, isNumeric: boolean) => void;
  runAnalysis: () => Promise<void>;
  resetData: () => void;
  modelType: AnalysisModel;
  setModelType: (model: AnalysisModel) => void;
  getCurrentPageData: () => DataRow[];
  getFactorValueMap: () => { [key: string]: string[] };
  allColumns: DataColumn[];
  loadAdditionalColumns: (columns: string[]) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [rawData, setRawData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<DataColumn[]>([]);
  const [allColumns, setAllColumns] = useState<DataColumn[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    type: string;
    size: number;
    fileId?: string;
  } | null>(null);
  const [dataStats, setDataStats] = useState<DataStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalRows, setTotalRows] = useState(0);
  const [modelType, setModelType] = useState<AnalysisModel>("auto");

  const loadAdditionalColumns = async (columns: string[]): Promise<boolean> => {
    if (!fileInfo?.fileId) return false;
    try {
      setIsLoading(true);
      const response = await fetch("/load-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileInfo.fileId, columns }),
      });
      if (!response.ok) throw new Error("Falha ao carregar colunas adicionais");
      const result = await response.json();
      setAllColumns((prev) => {
        const names = new Set(prev.map((c) => c.name));
        return [
          ...prev,
          ...result.columns.filter((c: DataColumn) => !names.has(c.name)),
        ];
      });
      return true;
    } catch (e) {
      toast.error("Erro ao carregar colunas adicionais");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getFactorValueMap = useCallback((): { [key: string]: string[] } => {
    if (
      !analysisResult?.factorAnalysis ||
      !Array.isArray(analysisResult.factorAnalysis)
    ) {
      return {};
    }

    const factorMap: { [key: string]: Set<string> } = {};

    analysisResult.factorAnalysis.forEach((factorItem) => {
      const factorName = factorItem.factor;
      const factorValues = factorItem.values;

      if (factorName && Array.isArray(factorValues)) {
        if (!factorMap[factorName]) {
          factorMap[factorName] = new Set<string>();
        }
        factorValues.forEach((level) => {
          if (level.value !== null && level.value !== undefined) {
            factorMap[factorName].add(String(level.value));
          }
        });
      }
    });

    const result: { [key: string]: string[] } = {};
    for (const key in factorMap) {
      result[key] = Array.from(factorMap[key]).sort();
    }
    return result;
  }, [analysisResult]);

  const handleFileUpload = async (file: File) => {
    try {
      const response = await parseFile(file);
      setAllColumns(
        response.columns.map((col: any) => ({
          ...col,
          selected: typeof col.selected === "boolean" ? col.selected : false,
        }))
      );

      setIsLoading(true);
      setRawData([]);
      setColumns([]);
      setAnalysisResult(null);
      setDataStats(null);
      setCurrentPage(1);
      setTotalRows(0);

      const processNumericColumns = (
        columns: DataColumn[],
        data: any[]
      ): DataColumn[] => {
        if (!data || data.length === 0) return columns;

        return columns.map((column) => {
          const sampleValues = data
            .slice(0, 100)
            .map((row) => row[column.name]);
          const numericCount = sampleValues.filter((val) => {
            if (val === null || val === undefined || val === "") return false;
            return !isNaN(Number(val));
          }).length;

          const isNumeric = numericCount / sampleValues.length > 0.8;

          const updatedColumn: DataColumn = {
            ...column,
            isNumeric,
            type:
              isNumeric && column.type === "string" ? "number" : column.type,
            role: column.role as
              | "estimatedDate"
              | "actualDate"
              | "factor"
              | "delay"
              | undefined,
          };

          return updatedColumn;
        }) as DataColumn[];
      };

      const result = (await parseFile(file)) as ParseFileResponse;

      if (!result.columns || result.columns.length === 0) {
        toast.error("Nenhuma coluna encontrada no arquivo.");
        return;
      }

      setFileInfo({
        name: file.name,
        type: file.type,
        size: file.size,
        fileId: result.fileId,
      });

      const autoRoleMap: Record<
        string,
        "estimatedDate" | "actualDate" | "factor"
      > = {
        "Scheduled Delivery Date": "estimatedDate",
        "Delivered to Client Date": "actualDate",
        Country: "factor",
        "Product Group": "factor",
        "Shipment Mode": "factor",
      };

      if (!result.chunked) {
        const response = await fetch(`${API_URL}/loadData`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileId: result.fileId }),
        });

        const rawResponse = await response.text();
        const cleanedResponse = rawResponse.replace(/:\s*NaN/g, ": null");
        const fullDataResult = JSON.parse(cleanedResponse);

        if (Array.isArray(fullDataResult.data)) {
          const dateKeys = result.columns
            .filter(
              (col) => col.role === "estimatedDate" || col.role === "actualDate"
            )
            .map((col) => col.name);
          const processedData = fullDataResult.data.map((row) => {
            const processedRow: any = { ...row };
            dateKeys.forEach((key) => {
              const value = processedRow[key];
              if (typeof value === "string") {
                const date = new Date(value);
                if (!isNaN(date.getTime())) processedRow[key] = date;
              }
            });
            return processedRow;
          });

          setRawData(processedData);
          setTotalRows(processedData.length);
          setCurrentPage(1);

          let updatedColumns = result.columns.map((col) => {
            const role = autoRoleMap[col.name];
            return {
              ...col,
              role,
              selected: !!role,
              isNumeric: col.isNumeric || col.type === "number",
            } as DataColumn;
          });

          updatedColumns = processNumericColumns(
            updatedColumns,
            fullDataResult.data
          );
          setColumns(updatedColumns);
          toast.success("Dados carregados com sucesso.");
        } else {
          toast.error("Formato de dados inesperado");
          return;
        }
      }

      if (result.chunked) {
        const chunkResponse = await getChunk(file, 0);
        if (Array.isArray(chunkResponse?.data)) {
          const dateKeys = result.columns
            .filter(
              (col) => col.role === "estimatedDate" || col.role === "actualDate"
            )
            .map((col) => col.name);
          const processedData = chunkResponse.data.map((row) => {
            const processedRow: any = { ...row };
            dateKeys.forEach((key) => {
              const value = processedRow[key];
              if (typeof value === "string") {
                const date = new Date(value);
                if (!isNaN(date.getTime())) processedRow[key] = date;
              }
            });
            return processedRow;
          });

          setRawData(processedData);
          setTotalRows(processedData.length);
          setCurrentPage(1);

          let updatedColumns = result.columns.map((col) => {
            const role = autoRoleMap[col.name];
            return {
              ...col,
              role,
              selected: !!role,
              isNumeric: col.isNumeric || col.type === "number",
            } as DataColumn;
          });

          updatedColumns = processNumericColumns(
            updatedColumns,
            chunkResponse.data
          );
          setColumns(updatedColumns);

          if (chunkResponse.hasMore) {
            toast.info(
              "Arquivo grande detectado. Carregando dados em partes..."
            );
          }
        } else {
          toast.error("Erro ao carregar dados do arquivo.");
        }
      }
    } catch (error) {
      toast.error(
        `Erro ao carregar o arquivo: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPageData = () => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return rawData.slice(start, end);
  };

  const updateColumnRole = (
    columnName: string,
    role: "estimatedDate" | "actualDate" | "factor" | "delay" | undefined
  ) => {
    setColumns((prevColumns) =>
      prevColumns.map((col) =>
        col.name === columnName
          ? { ...col, selected: role !== undefined, role }
          : col
      )
    );
  };

  const updateColumnNumeric = (columnName: string, isNumeric: boolean) => {
    setColumns((prevColumns) =>
      prevColumns.map((col) =>
        col.name === columnName
          ? {
              ...col,
              isNumeric,
              type: isNumeric && col.type === "string" ? "number" : col.type,
              role: col.role as
                | "estimatedDate"
                | "actualDate"
                | "factor"
                | "delay"
                | undefined,
            }
          : col
      )
    );
  };

  const fileInfoRef = useRef(fileInfo);

  useEffect(() => {
    fileInfoRef.current = fileInfo;
  }, [fileInfo]);

  const runAnalysis = async () => {
    try {
      setIsLoading(true);
      setAnalysisResult(null);

      const selectedColumns = columns.filter((col) => col.selected);
      if (selectedColumns.length === 0) {
        toast.error("Selecione pelo menos uma coluna para análise");
        setIsLoading(false);
        return;
      }

      const hasEstimatedDate = selectedColumns.some(
        (col) => col.role === "estimatedDate"
      );
      const hasActualDate = selectedColumns.some(
        (col) => col.role === "actualDate"
      );
      const hasDelay = selectedColumns.some((col) => col.role === "delay");

      if (!((hasEstimatedDate && hasActualDate) || hasDelay)) {
        toast.error(
          "Mapeie as colunas de data estimada/real ou a coluna de atraso para análise."
        );
        setIsLoading(false);
        return;
      }

      const currentFileId = fileInfoRef.current?.fileId;
      if (!currentFileId) {
        toast.error(
          "ID do arquivo não encontrado. Não é possível iniciar a análise."
        );
        setIsLoading(false);
        return;
      }

      const requestPayload = {
        dataset: rawData,
        columns: selectedColumns.map((col) => ({
          name: col.name,
          label: col.label,
          type: col.type,
          role: col.role,
        })),
        modelType,
        fileId: currentFileId,
      };

      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `HTTP error! status: ${response.status}`
        );
      }

      setAnalysisResult(result);
      toast.success("Análise concluída com sucesso");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao executar análise: ${errorMessage}`);
      setAnalysisResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const resetData = () => {
    setRawData([]);
    setColumns([]);
    setAnalysisResult(null);
    setFileInfo(null);
    setDataStats(null);
    setCurrentPage(1);
    setTotalRows(0);
    setModelType("auto");
  };

  return (
    <DataContext.Provider
      value={{
        rawData,
        columns,
        analysisResult,
        isLoading,
        fileInfo,
        dataStats,
        currentPage,
        pageSize,
        totalRows,
        setCurrentPage,
        setPageSize,
        handleFileUpload,
        updateColumnRole,
        updateColumnNumeric,
        runAnalysis,
        resetData,
        modelType,
        setModelType,
        getCurrentPageData,
        getFactorValueMap,
        allColumns,
        loadAdditionalColumns,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
