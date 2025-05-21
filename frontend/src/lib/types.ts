export interface DataColumn {
  name: string;
  label: string;
  type: "date" | "number" | "string" | "boolean";
  selected: boolean;
  isNumeric?: boolean;
  role?: "estimatedDate" | "actualDate" | "factor" | "delay";
}

export interface DataRow {
  [key: string]: string | number | Date | boolean;
}

export interface DataStats {
  totalRows: number;
  isPartialData: boolean;
  originalFileSize: number;
  processedAt: Date;
}

export interface AnalysisResult {
  delayStatistics: {
    averageDelay: number;
    medianDelay: number;
    minDelay: number;
    maxDelay: number;
    stdDevDelay?: number;
    totalRowsWithDelay?: number;
    totalRowsWithoutDelay?: number;
  } | null;
  factorAnalysis: FactorAnalysis[];
  timeSeriesAnalysis?: TimeSeriesAnalysis | null;
  glmAnalysis?: GlmAnalysis | null;
  insights: string[];
  modelUsed?: string;
  modelType?: string;
  error?: string;
  totalRows: number;
}

export interface FactorAnalysis {
  factor: string;
  values: {
    value: string;
    count: number;
    averageDelay: number;
    percentDifference: number;
  }[];
}

export interface TimeSeriesAnalysis {
  historical: HistoricalPoint[];
  forecast: ForecastPoint[];
  trend: "increasing" | "decreasing" | "stable";
  seasonality: boolean;
  model_details: {
    type: string;
    order: string;
    aic: number;
    bic: number;
    significant: boolean;
  };
  message?: string;
}

export interface HistoricalPoint {
  date: string;
  actual_delay: number;
}

export interface ForecastPoint {
  date: string;
  predicted_delay: number;
  conf_int_lower: number;
  conf_int_upper: number;
}

export interface GlmAnalysis {
  coefficients: GlmCoefficient[];
  pseudo_r_squared: number | null;
  model_details: {
    family: string;
    link: string;
    n_observations: number;
  };
  message?: string;
}

export interface GlmCoefficient {
  variable: string;
  coefficient: number;
  std_err: number;
  p_value: number;
  significant: boolean;
}


export interface PredictionResult {
  predictedDelay: number;
  confidenceInterval: [number, number];
  reliability: number;
  similarCases: number;
  error?: string;
}
