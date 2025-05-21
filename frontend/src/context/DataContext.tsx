import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef, useMemo } from "react";
import { DataRow, DataColumn, AnalysisResult, DataStats } from "@/lib/types";
import { toast } from "@/lib/toast-helpers";
import { parseFile, getChunk, ParseFileResponse, ChunkResponse } from "@/lib/api";


const DEFAULT_PAGE_SIZE = 10;

type AnalysisModel = "regression" | "arima" | "auto";
type ColumnRole = "estimatedDate" | "actualDate" | "factor" | "delay" | undefined;

interface FileUploadOptions {
  columnMapping?: Record<string, ColumnRole>;
  numericColumns?: string[];
}

interface FileInfo {
  name: string;
  type: string;
  size: number;
  fileId?: string;
  totalRows?: number;
  isPartialData?: boolean;
}

import { TEST_CONFIG, ExampleFile } from "@/config/testConfig";

interface DataContextType {
  columns: DataColumn[];
  allColumns: DataColumn[];
  rawData: DataRow[];
  analysisResult: AnalysisResult | null;
  dataStats: DataStats | null;
  currentPage: number;
  totalRows: number;
  isLoading: boolean;
  fileInfo: FileInfo | null;
  selectedModel: AnalysisModel;
  selectedExampleId: string | null;
  selectedExampleFile: ExampleFile | null;
  setSelectedExample: (id: string | null) => void;
  handleFileUpload: (file: File, options?: FileUploadOptions & { exampleId?: string }) => Promise<ParseFileResponse>;
  updateColumnRole: (columnName: string, role: ColumnRole) => void;
  updateNumericColumns: (columnNames: string[], isNumeric: boolean) => void;
  analyzeData: () => Promise<void>;
  resetAnalysis: () => void;
  setCurrentPage: (page: number) => void;
  setSelectedModel: (model: AnalysisModel) => void;
  loadAdditionalColumns: () => Promise<void>;
  processNumericColumns: (data: DataRow[], columns: DataColumn[]) => DataRow[];
  getCurrentPageData: () => DataRow[];
  getFactorValueMap: () => { [key: string]: string[] };
  resetData: () => void;
  modelType: AnalysisModel;
  setModelType: (model: AnalysisModel) => void;
}


interface ExtendedParseResponse extends Omit<ParseFileResponse, 'columns' | 'chunked'> {
  columns: (ParseFileResponse['columns'][number] & {
    selected?: boolean;
    isNumeric?: boolean;
    role?: ColumnRole;
  })[];
  data?: any[];
  fileId?: string;
  isPartialData?: boolean;
  chunked?: boolean; 
}

const DataContext = createContext<DataContextType | undefined>(undefined);


const processNumericColumns = (data: DataRow[], columns: DataColumn[]): DataRow[] => {
  if (!data || data.length === 0) return [];
  
  return data.map(row => {
    const newRow = { ...row };
    columns.forEach(column => {
      if (column.isNumeric && column.name in newRow) {
        const value = newRow[column.name];
        if (value !== null && value !== undefined && value !== '') {
          const num = Number(value);
          if (!isNaN(num)) {
            newRow[column.name] = num;
          }
        }
      }
    });
    return newRow;
  });
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  
  const [columns, setColumns] = useState<DataColumn[]>([]);
  const [allColumns, setAllColumns] = useState<DataColumn[]>([]);
  const [rawData, setRawData] = useState<DataRow[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [dataStats, setDataStats] = useState<DataStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [selectedModel, setSelectedModel] = useState<AnalysisModel>("auto");
  const [modelType, setModelType] = useState<AnalysisModel>("auto");
  const [fileId, setFileId] = useState<string | null>(null);
  
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null);
  const selectedExampleFile = selectedExampleId ? TEST_CONFIG.EXAMPLE_FILES.find(f => f.id === selectedExampleId) || null : null;
  const setSelectedExample = (id: string | null) => setSelectedExampleId(id);

  
  const currentPageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return rawData.slice(start, end);
  }, [rawData, currentPage, pageSize]);

  const factorValueMap = useMemo(() => {
    const map: { [key: string]: Set<string> } = {};
    columns.forEach(col => {
      if (col.role === 'factor') {
        const values = new Set<string>();
        rawData.forEach(row => {
          if (row[col.name] !== undefined && row[col.name] !== null) {
            values.add(String(row[col.name]));
          }
        });
        map[col.name] = values;
      }
    });
    
    const result: { [key: string]: string[] } = {};
    Object.entries(map).forEach(([key, valueSet]) => {
      result[key] = Array.from(valueSet);
    });
    return result;
  }, [columns, rawData]);

  
  const resetData = useCallback(() => {
    setRawData([]);
    setColumns([]);
    setAllColumns([]);
    setAnalysisResult(null);
    setDataStats(null);
    setFileInfo(null);
    setTotalRows(0);
    setCurrentPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setFileId(null);
    setSelectedModel("auto");
    setModelType("auto");
  }, []);

  
  const resetAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setDataStats(null);
    setSelectedModel("auto");
  }, []);

  const fileInfoRef = useRef<FileInfo | null>(null);
  useEffect(() => {
    fileInfoRef.current = fileInfo;
  }, [fileInfo]);

  
  const getCurrentPageData = useCallback(() => currentPageData, [currentPageData]);
  
  const getFactorValueMap = useCallback(() => factorValueMap, [factorValueMap]);

  
  const updateColumnRole = useCallback((columnName: string, role: ColumnRole) => {
    setColumns(prevColumns => {
      const updated = prevColumns.map(col => col.name === columnName ? { ...col, role } : col);
return updated;
    });
    setAllColumns(prevColumns => {
      const updated = prevColumns.map(col => col.name === columnName ? { ...col, role } : col);
      return updated;
    });
  }, []);

  
  const updateNumericColumns = useCallback((columnNames: string[], isNumeric: boolean) => {
    setAllColumns(prevColumns => prevColumns.map(col => columnNames.includes(col.name) ? { ...col, isNumeric } : col));
    setColumns(prevColumns => prevColumns.map(col => columnNames.includes(col.name) ? { ...col, isNumeric } : col));
  }, []);

  
  const handleFileUpload = useCallback(
    async (file: File, options?: FileUploadOptions) => {
      setIsLoading(true);
      try {
        if (options?.exampleId) {
          setSelectedExampleId(options.exampleId);
        }
        const result = await parseFile(file);
        setRawData(result.data || []);
        const normalizeColumnName = (name: string): string =>
          name.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
        let columns = (result.columns as DataColumn[] || []).map(col => {
          let updated = { ...col, name: normalizeColumnName(col.name) };
          
          if (options?.columnMapping) {
            
            const mappedRole = Object.entries(options.columnMapping).find(
              ([key]) => normalizeColumnName(key) === normalizeColumnName(col.name)
            )?.[1];
            if (mappedRole) updated.role = mappedRole;
          }
          
          if (options?.numericColumns && options.numericColumns.some(nc => normalizeColumnName(nc) === normalizeColumnName(col.name))) {
            updated.isNumeric = true;
          }
          return updated;
        });
        setColumns(columns);
        setAllColumns(columns);
        setFileInfo({
          name: file.name,
          type: file.type,
          size: file.size,
          fileId: result.fileId,
          totalRows: result.totalRows,
          isPartialData: result.isPartialData,
        });
        setTotalRows(result.totalRows || 0);
        setCurrentPage(1);
        setPageSize(DEFAULT_PAGE_SIZE);
        setAnalysisResult(null);
        setDataStats(null);
        setSelectedModel("auto");
        setModelType("auto");
        return result;
      } catch (error: any) {
        
        console.error('Erro ao fazer upload do arquivo:', error);
        let message = "Erro ao fazer upload do arquivo.";
        if (error?.response?.data?.error) {
          message = error.response.data.error;
        } else if (error?.message) {
          message = error.message;
        }
        toast.error(message);
        resetData();
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [resetData]
  );

  
  const analyzeData = useCallback(async () => {
    if (!fileInfo?.fileId || !columns.length) {
      toast.error('Arquivo ou colunas não encontrados.');
      return;
    }
    try {
      setIsLoading(true);
      setAnalysisResult(null);

      
      const hasEstimatedDate = columns.some(col => col.role === 'estimatedDate');
      const hasActualDate = columns.some(col => col.role === 'actualDate');
      if (!hasEstimatedDate || !hasActualDate) {
        toast.error('Selecione as colunas de data estimada e data real.');
        setIsLoading(false);
        return;
      }

      
      const requestPayload = {
        dataset: rawData,
        columns: columns.map(col => ({
          name: col.name,
          label: col.label,
          type: col.type,
          role: col.role,
        })),
        modelType,
        fileId: fileInfo.fileId,
      };

      
      const apiBase = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== 'undefined'
        ? import.meta.env.VITE_API_URL
        : '/api';
      const response = await fetch(`${apiBase}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      setAnalysisResult(result);
      setDataStats({
        totalRows: rawData.length,
        isPartialData: false,
        originalFileSize: fileInfo.size || 0,
        processedAt: new Date(),
      });
      toast.success('Análise concluída com sucesso');
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao executar análise: ${errorMessage}`);
      setAnalysisResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [fileInfo, columns, rawData, modelType]);

  

  return (
    <DataContext.Provider
      value={{
        columns,
        allColumns,
        rawData,
        analysisResult,
        dataStats,
        currentPage,
        totalRows,
        isLoading,
        fileInfo,
        selectedModel,
        handleFileUpload,
        updateColumnRole,
        updateNumericColumns,
        analyzeData,
        resetAnalysis,
        setCurrentPage,
        setSelectedModel,
        loadAdditionalColumns: async () => { return; }, 
        processNumericColumns,
        getCurrentPageData,
        getFactorValueMap,
        resetData,
        modelType,
        setModelType,
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
