import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CalendarCheck, CalendarClock, TableProperties, CheckCircle2, PlusCircle, X } from "lucide-react";
import { TEST_CONFIG } from "@/config/testConfig";
import { DataColumn } from "@/lib/types";

type ColumnRole = "estimatedDate" | "actualDate" | "factor" | "delay" | undefined;

interface ColumnMappingProps {
  
}

const ColumnMapping: React.FC<ColumnMappingProps> = () => {
  
  const normalizeColumnName = (name: string): string =>
    name.trim().toLowerCase().replace(/[^a-z0-9]/gi, "");
  const {
    columns: allColumns = [],
    updateColumnRole,
    updateNumericColumns,
    analyzeData,
    isLoading = false,
  } = useData();
  
  
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [activeFactors, setActiveFactors] = useState<boolean[]>([]);

  useEffect(() => {
    const backendFactors = allColumns.filter(col => col.role === 'factor').map(col => col.originalName ?? col.name);
    if (
      backendFactors.length > 0 &&
      (backendFactors.length !== selectedFactors.length || backendFactors.some((f, i) => f !== selectedFactors[i]))
    ) {
      setSelectedFactors(backendFactors);
      setActiveFactors(Array(backendFactors.length).fill(false));
    }
  }, [allColumns]);
  
  
  const availableColumns = useMemo(() => {
    return allColumns.filter(col => !selectedFactors.includes(col.originalName ?? col.name));
  }, [allColumns, selectedFactors]);
  
  
  
  const estimatedDateColumn = useMemo(() => 
    allColumns.find((col) => col.role === "estimatedDate"),
    [allColumns]
  );
  
  const actualDateColumn = useMemo(() => 
    allColumns.find((col) => col.role === "actualDate"),
    [allColumns]
  );
  
  const canRunAnalysis = useMemo(() => 
    estimatedDateColumn && actualDateColumn,
    [estimatedDateColumn, actualDateColumn]
  );

  
  const { selectedExampleFile } = useData();

  


  
  const handleRoleChange = useCallback((
    columnName: string,
    role?: ColumnRole
  ) => {
    const column = allColumns.find(col => col.originalName ?? col.name === columnName);
    if (!column) return;
    
    
    if (column.role === role) return;
    
    
    if (column.role) {
      
      if (column.role === 'factor') {
        setSelectedFactors(prev => prev.filter(name => name !== columnName));
        setActiveFactors(prev => {
          const index = selectedFactors.indexOf(columnName);
          if (index === -1) return prev;
          return prev.filter((_, i) => i !== index);
        });
      }
      updateColumnRole(columnName, undefined);
    }
    
    
    if (role) {
      updateColumnRole(columnName, role);
      
      
      if (role === 'factor' && !selectedFactors.includes(columnName)) {
        setSelectedFactors(prev => [...prev, columnName]);
        setActiveFactors(prev => [...prev, false]);
      }
    }
  }, [allColumns, selectedFactors, updateColumnRole]);

  
  const addFactorColumn = useCallback(() => {
  setSelectedFactors(prev => [...prev, ""]);
  setActiveFactors(prev => [...prev, false]);
}, []);

  
  const removeFactorColumn = useCallback((index: number) => {
  setSelectedFactors(prev => {
    const removed = prev[index];
    if (removed && removed !== "") {
      updateColumnRole(removed, undefined);
    }
    const updated = [...prev];
    updated.splice(index, 1);
    return updated;
  });
  setActiveFactors(prev => {
    const updated = [...prev];
    updated.splice(index, 1);
    return updated;
  });
}, [updateColumnRole]);

  const updateFactorColumn = useCallback((index: number, columnName: string) => {
  const previousColumn = selectedFactors[index];
  if (previousColumn === columnName) return;
  if (previousColumn && previousColumn !== "") {
    updateColumnRole(previousColumn, undefined);
  }
  setSelectedFactors(prev => {
    const updated = [...prev];
    updated[index] = columnName;
    return updated;
  });
  if (columnName !== "") {
    updateColumnRole(columnName, 'factor');
    const normalizedColumnName = columnName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isNumeric = normalizedColumnName.includes('weight') || 
                     normalizedColumnName.includes('quantidade') ||
                     normalizedColumnName.includes('valor') ||
                     normalizedColumnName.includes('price') ||
                     normalizedColumnName.includes('cost') ||
                     normalizedColumnName.includes('value');
    setActiveFactors(prev => {
      const updated = [...prev];
      updated[index] = isNumeric;
      return updated;
    });
    updateNumericColumns([columnName], isNumeric);
  }
}, [selectedFactors, updateColumnRole, updateNumericColumns]);

  const getAvailableColumns = useCallback((currentColumn?: string) => {
    return allColumns.filter(col => {
      
      if (col.originalName ?? (col.originalName ?? col.name) === currentColumn) return true;
      
      
      if (col.role === undefined) return true;
      
      
      if (col.role === 'factor' && selectedFactors.includes(col.originalName ?? col.name)) return true;
      
      return false;
    });
  }, [allColumns, selectedFactors]);

  
  const handleToggleActiveFactor = (index: number) => {
    const columnName = selectedFactors[index];
    if (!columnName) return;
    
    
    const currentStatus = activeFactors[index] ?? false;
    const newStatus = !currentStatus;
    
    
    setActiveFactors(prev => {
      const updated = [...prev];
      updated[index] = newStatus;
      return updated;
    });
    
    
    updateNumericColumns([columnName], newStatus);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="border-2 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <TableProperties className="mr-2 h-5 w-5" /> Mapeie Suas Colunas de
            Dados
          </CardTitle>
          <CardDescription>
            Selecione as colunas necessárias para a análise e adicione fatores
            opcionais.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="w-full">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">
                Colunas de Data Obrigatórias
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="border rounded-md p-4 bg-muted/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <CalendarClock className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-sm font-medium">
                        Data de Entrega Estimada
                      </span>
                    </div>
                    {estimatedDateColumn && (
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Selecionada
                      </Badge>
                    )}
                  </div>
                  <Select
  onValueChange={(value) => {
    if (estimatedDateColumn && estimatedDateColumn.name !== value) {
      updateColumnRole(estimatedDateColumn.name, undefined);
    }
    handleRoleChange(value, "estimatedDate");
  }}
  value={estimatedDateColumn?.name || ""}
  disabled={isLoading}
>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Selecione a coluna de data estimada" />
  </SelectTrigger>
  <SelectContent>
    {allColumns
      .filter(col => {
        const colName = col.originalName ?? col.name;
        const inUse =
          (actualDateColumn && actualDateColumn.name === colName) ||
          selectedFactors.includes(colName);
        return col.role === undefined || col.role === "estimatedDate" || (estimatedDateColumn && estimatedDateColumn.name === colName);
      })
      .map((column) => (
        <SelectItem key={column.name} value={column.name}>
          {column.name}
        </SelectItem>
      ))}
  </SelectContent>
</Select>
                </div>
                <div className="border rounded-md p-4 bg-muted/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <CalendarCheck className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-sm font-medium">
                        Data de Entrega Real
                      </span>
                    </div>
                    {actualDateColumn && (
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Selecionada
                      </Badge>
                    )}
                  </div>
                  <Select
                    onValueChange={(value) => {
                      if (actualDateColumn && actualDateColumn.name !== value) {
                        updateColumnRole(actualDateColumn.name, undefined);
                      }
                      handleRoleChange(value, "actualDate");
                    }}
                    value={actualDateColumn?.name || ""}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a coluna de data real" />
                    </SelectTrigger>
                    <SelectContent>
                      {allColumns
                        .filter(col => {
                          const colName = col.originalName ?? col.name;
                          const inUse =
                            (estimatedDateColumn && estimatedDateColumn.name === colName) ||
                            selectedFactors.includes(colName);
                          return col.role === undefined || col.role === "actualDate" || (actualDateColumn && actualDateColumn.name === colName);
                        })
                        .map((column) => (
                          <SelectItem key={column.name} value={column.name}>
                            {column.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Fatores Adicionais (Opcional)
              </h3>
              <span className="text-xs text-muted-foreground">
                {selectedFactors.filter(Boolean).length} fatores selecionados
              </span>
            </div>
             <div className="space-y-3">
              {selectedFactors.map((factor, index) => (
  <div key={index} className="flex items-center gap-2">
    <div className="flex-1">
      <Select
        onValueChange={(value) => updateFactorColumn(index, value)}
        value={factor || ""}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione uma coluna de fator" />
        </SelectTrigger>
        <SelectContent>
          {allColumns
  .filter(c => {
    const colName = c.originalName ?? c.name;
    const inUse =
      (estimatedDateColumn && estimatedDateColumn.name === colName) ||
      (actualDateColumn && actualDateColumn.name === colName) ||
      (selectedFactors.some((f, i) => f === colName && i !== index));
    return !inUse || (factor && colName === factor);
  })
  .map((column) => (
    <SelectItem key={column.name} value={column.name}>
      {column.name}
    </SelectItem>
  ))
}</SelectContent>
      </Select>
    </div>
    {factor && (
      <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          checked={!!allColumns.find(c => (c.originalName ?? c.name) === factor)?.isNumeric}
          onChange={() => updateNumericColumns([factor],
            !allColumns.find(c => (c.originalName ?? c.name) === factor)?.isNumeric
          )}
          className="accent-primary h-4 w-4"
        />
        Numérico?
      </label>
    )}
    <Button
      variant="ghost"
      size="icon"
      onClick={() => removeFactorColumn(index)}
      disabled={isLoading}
    >
      <X className="h-4 w-4" />
    </Button>
  </div>
))}
              <Button
                variant="outline"
                className="w-full"
                onClick={addFactorColumn}
                disabled={isLoading || getAvailableColumns().length === 0}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Novo Fator
              </Button>
            </div>
          </div>
          {!canRunAnalysis && (
            <div className="rounded-md bg-amber-50 p-3 text-amber-800 text-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-amber-600"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 6V10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 14H10.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p>
                    Por favor, selecione as colunas de data estimada e data real
                    para prosseguir com a análise.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={analyzeData} disabled={isLoading}>
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Analisando...
              </>
            ) : (
              <>
                Analisar Dados
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ColumnMapping;
