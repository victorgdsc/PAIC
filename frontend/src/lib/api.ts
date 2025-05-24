import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const api = axios.create({
  baseURL: API_URL,
});

export { api, API_URL };


export const uploadCSVFromDriveLink = async (link: string) => {
  const res = await fetch(`${API_URL}/api/upload-from-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: link }),
  });
  if (!res.ok) throw new Error("Erro ao baixar o arquivo do Drive pelo backend");
  return await res.json();
};

export const getForecast = async (params: URLSearchParams) => {
  try {
    const response = await api.get(`/api/forecast?${params.toString()}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || "Erro ao obter forecast");
    }
    throw error;
  }
};

export interface AnalyzeRequest {
  fileId: string;
  dataset?: any[];
  columns: {
    name: string;
    role: "estimatedDate" | "actualDate" | "factor" | "delay";
    type?: 'string' | 'number' | 'boolean' | 'date';
  }[];
  modelType?: string;
  isPartial?: boolean;
  isFinal?: boolean;
}

export const analyzeData = async (request: AnalyzeRequest) => {
  try {
    const response = await api.post("/api/analyze", request);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || "Erro ao analisar dados");
    }
    throw error;
  }
};

export interface PredictRequest {
  fileId: string;
  data: any[];
  columns: {
    name: string;
    type: "string" | "number" | "boolean" | "date";
    role: "estimatedDate" | "actualDate" | "factor" | "delay";
  }[];
  query: any;
}

export async function predictDelay(payload: PredictRequest) {
  try {
    const response = await api.post("/api/predict", payload);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || "Erro ao fazer predição");
    }
    throw error;
  }
}

export interface ParseFileResponse {
  columns: {
    name: string;
    label: string;
    type: "date" | "number" | "string" | "boolean";
    selected?: boolean;
    isNumeric?: boolean;
    role?: string;
  }[];
  chunked: boolean;
  data?: any[];
  fileId?: string;
  totalRows?: number;
  isPartialData?: boolean;
}

const CHUNK_SIZE = 5 * 1024 * 1024; 

export const parseFile = async (file: File): Promise<ParseFileResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/parseFile", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 300000, 
    });
    if (!response.data) {
      throw new Error('Resposta vazia do servidor');
    }
    
    const result: ParseFileResponse = {
      columns: Array.isArray(response.data.columns) ? response.data.columns : [],
      chunked: Boolean(response.data.chunked),
      data: Array.isArray(response.data.data) ? response.data.data : [],
      fileId: response.data.fileId || `file_${Date.now()}`,
      isPartialData: Boolean(response.data.chunked || response.data.isPartialData),
      totalRows: response.data.totalRows || (Array.isArray(response.data.data) ? response.data.data.length : 0)
    };
    
    if (!result.fileId) {
      console.error('No fileId in response:', response.data);
      throw new Error('ID do arquivo não retornado pelo servidor');
    }
return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || "Erro ao processar arquivo";
      console.error('API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(errorMessage);
    }
    console.error('Unexpected error:', error);
    throw new Error("Erro inesperado ao processar o arquivo");
  }
};

export interface ChunkResponse {
  data: any[];
  hasMore: boolean;
}

export const getChunk = async (fileId: string, chunkIndex: number): Promise<ChunkResponse> => {
  try {
    const response = await api.get(`/getChunk/${fileId}/${chunkIndex}`, {
      timeout: 300000, 
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || "Erro ao obter chunk de dados"
      );
    }
    throw error;
  }
};
