import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const api = axios.create({
  baseURL: API_URL,
});

export { api };

export const getForecast = async (params: URLSearchParams) => {
  try {
    const response = await api.get(`/forecast?${params.toString()}`);
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
  columns: {
    name: string;
    role: "estimatedDate" | "actualDate" | "factor" | "delay";
  }[];
  modelType?: string;
}

export const analyzeData = async (request: AnalyzeRequest) => {
  try {
    const response = await api.post("/analyze", request);
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
    const response = await api.post("/predict", payload);
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
  }[];
  chunked: boolean;
}

export const parseFile = async (file: File): Promise<ParseFileResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/parseFile", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || "Erro ao processar arquivo"
      );
    }
    throw error;
  }
};

export interface ChunkResponse {
  data: any[];
  hasMore: boolean;
}

export const getChunk = async (
  file: File,
  chunkIndex: number
): Promise<ChunkResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chunk_index", chunkIndex.toString());

    const response = await api.post("/getChunk", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
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
