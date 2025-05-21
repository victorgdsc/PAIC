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
  
  
  const availableColumns = useMemo(() => {
    return allColumns.filter(col => !selectedFactors.includes(col.name));
  }, [allColumns, selectedFactors]);
  
  
  const factorColumns = useMemo(() => {
    return allColumns.filter(col => col.role === 'factor');
  }, [allColumns]);
  
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

  
  useEffect(() => {
    if (!selectedExampleFile || !selectedExampleFile.columnMapping) return;
    const fileConfig = selectedExampleFile || TEST_CONFIG.DEFAULT_FILE;
    if (!fileConfig.columnMapping) return;

    
    ['estimatedDate', 'actualDate'].forEach((role) => {
      const mapped = Object.entries(fileConfig.columnMapping).find(
        ([, r]) => r === role
      );
      if (mapped) {
        const [columnName] = mapped;
        
        const match = allColumns.find(
          col => normalizeColumnName(col.name) === normalizeColumnName(columnName)
        );
        if (match && match.role !== role) {
          updateColumnRole(match.name, role as any);
        }
      }
    });
  }, [allColumns, updateColumnRole, selectedExampleFile]);

  
  useEffect(() => {
    
    if (!selectedExampleFile || !selectedExampleFile.columnMapping || !selectedExampleFile.id) return;
    if (!allColumns.length) return;

    
    allColumns.forEach(col => {
      if (col.role) {
        updateColumnRole(col.name, undefined);
      }
    });

    
    Object.entries(selectedExampleFile.columnMapping).forEach(([columnName, role]) => {
      const normalizedTargetName = normalizeColumnName(columnName);
      const matchingColumns = allColumns.filter(col =>
        normalizeColumnName(col.name) === normalizedTargetName
      );
      if (matchingColumns.length > 0) {
        console.log(`[ColumnMapping] Vai selecionar:`, {
          columnName,
          role,
          matchingColumns: matchingColumns.map(col => col.name)
        });
      }
      matchingColumns.forEach(col => {
        if (col.role !== role) {
          updateColumnRole(col.name, role);
        }
      });
    });

    
    setTimeout(() => {
}, 100);

    
    if (selectedExampleFile.numericColumns) {
      updateNumericColumns(selectedExampleFile.numericColumns);
    }

    
    const factorColumns = Object.entries(selectedExampleFile.columnMapping)
      .filter(([_, role]) => role === 'factor')
      .map(([colName]) => colName);

    
    const validFactorColumns = factorColumns.filter(colName =>
      allColumns.some(col => normalizeColumnName(col.name) === normalizeColumnName(colName))
    );

    setSelectedFactors(validFactorColumns);

    
    const initialActiveFactors = validFactorColumns.map(colName =>
      selectedExampleFile.numericColumns?.some(nc => normalizeColumnName(nc) === normalizeColumnName(colName)) || false
    );

    setActiveFactors(initialActiveFactors);

    
    setTimeout(() => {
}, 100);
  }, [allColumns, updateColumnRole, updateNumericColumns, selectedExampleFile]);

  useEffect(() => {
    
    const initialActiveFactors = selectedFactors.map(factor => {
      const column = allColumns.find(col => col.name === factor);
      return column ? !!column.isNumeric : false;
    });
    setActiveFactors(initialActiveFactors);
  }, [selectedFactors, allColumns]);

  const handleRoleChange = useCallback((
    columnName: string,
    role?: ColumnRole
  ) => {
    const column = allColumns.find(col => col.name === columnName);
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
    const available = allColumns.find(col => !col.role);
    if (available) {
      updateColumnRole(available.name, 'factor');
    }
  }, [allColumns, updateColumnRole]);

  
  const removeFactorColumn = useCallback((columnName: string) => {
    updateColumnRole(columnName, undefined);
  }, [updateColumnRole]);

  const updateFactorColumn = useCallback((index: number, columnName: string) => {
    const previousColumn = selectedFactors[index];
    
    
    if (previousColumn === columnName) return;

    
    if (previousColumn) {
      const isUsedElsewhere = allColumns.some(col => 
        col.name === previousColumn && 
        col.role === 'factor' && 
        !selectedFactors.includes(previousColumn)
      );
      
      if (!isUsedElsewhere) {
        updateColumnRole(previousColumn, undefined);
      }
    }

    
    setSelectedFactors(prev => {
      const updated = [...prev];
      updated[index] = columnName;
      return updated;
    });

    
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

    
    if (isNumeric) {
      updateNumericColumns([columnName], true);
    } else {
      updateNumericColumns([columnName], false);
    }
  }, [allColumns, selectedFactors, updateColumnRole, updateNumericColumns]);

  const getAvailableColumns = useCallback((currentColumn?: string) => {
    return allColumns.filter(col => {
      
      if (col.name === currentColumn) return true;
      
      
      if (col.role === undefined) return true;
      
      
      if (col.role === 'factor' && selectedFactors.includes(col.name)) return true;
      
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
                    onValueChange={(value) =>
                      handleRoleChange(value, "estimatedDate")
                    }
                    value={estimatedDateColumn?.name || ""}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a coluna de data estimada" />
                    </SelectTrigger>
                    <SelectContent>
                      {allColumns
                        .filter(
                          (col) =>
                            col.role === undefined ||
                            col.role === "estimatedDate"
                        )
                        .map((column) => (
                          <SelectItem key={column.name} value={column.name}>
                            {column.label}
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
                    onValueChange={(value) =>
                      handleRoleChange(value, "actualDate")
                    }
                    value={actualDateColumn?.name || ""}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a coluna de data real" />
                    </SelectTrigger>
                    <SelectContent>
                      {allColumns
                        .filter(
                          (col) =>
                            col.role === undefined || col.role === "actualDate"
                        )
                        .map((column) => (
                          <SelectItem key={column.name} value={column.name}>
                            {column.label}
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
              {factorColumns.map((col, index) => (
                <div key={col.name} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      onValueChange={(value) => updateColumnRole(value, 'factor')}
                      value={col.name}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma coluna de fator" />
                      </SelectTrigger>
                      <SelectContent>
                        {allColumns
                          .filter(c => !c.role || c.role === 'factor' || c.name === col.name)
                          .map((column) => (
                            <SelectItem key={column.name} value={column.name}>
                              {column.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!col.isNumeric}
                      onChange={() => updateNumericColumns([col.name], !col.isNumeric)}
                      className="accent-primary h-4 w-4"
                    />
                    Numérico?
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFactorColumn(col.name)}
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
          <Button onClick={analyzeData} disabled={isLoading || !canRunAnalysis}>
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
