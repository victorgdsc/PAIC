import React, { useState, useEffect } from "react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CalendarCheck, CalendarClock, TableProperties, CheckCircle2, PlusCircle, X } from "lucide-react";
import { TEST_CONFIG } from "@/config/testConfig";

const ColumnMapping: React.FC = () => {
  const {
    columns,
    updateColumnRole,
    updateColumnNumeric,
    runAnalysis,
    isLoading,
  } = useData();
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [activeFactors, setActiveFactors] = useState<boolean[]>([]);

  useEffect(() => {
    if (
      !TEST_CONFIG.AUTO_MAP_FIXED_FACTORS ||
      columns.length === 0 ||
      selectedFactors.length > 0
    )
      return;
    const fixedFactors = [
      "Country",
      "Product Group",
      "Shipment Mode",
      "Weight (Kilograms)",
    ];
    fixedFactors.forEach((col) => {
      updateColumnRole(col, "factor");
      if (col.toLowerCase().includes("weight")) {
        updateColumnNumeric(col, true);
      }
    });
    setSelectedFactors(fixedFactors);
  }, [columns]);

  useEffect(() => {
    setActiveFactors(selectedFactors.map(() => false));
  }, [selectedFactors.length]);

  const handleRoleChange = (
    columnName: string,
    role?: "estimatedDate" | "actualDate" | "factor" | "delay"
  ) => {
    updateColumnRole(columnName, role);
  };

  const addFactorColumn = () => {
    setSelectedFactors([...selectedFactors, ""]);
  };

  const removeFactorColumn = (index: number) => {
    const columnToRemove = selectedFactors[index];
    if (columnToRemove) {
      handleRoleChange(columnToRemove, undefined);
    }
    const updatedFactors = [...selectedFactors];
    updatedFactors.splice(index, 1);
    setSelectedFactors(updatedFactors);
  };

  const updateFactorColumn = (index: number, columnName: string) => {
    const previousColumn = selectedFactors[index];
    if (previousColumn) {
      handleRoleChange(previousColumn, undefined);
    }

    const updatedFactors = [...selectedFactors];
    updatedFactors[index] = columnName;
    setSelectedFactors(updatedFactors);

    handleRoleChange(columnName, "factor");

    const isWeightColumn =
      TEST_CONFIG.AUTO_MAP_FIXED_FACTORS &&
      columnName.toLowerCase().includes("weight");

    if (isWeightColumn) {
      updateColumnNumeric(columnName, true);
      setActiveFactors((prev) => {
        const updated = [...prev];
        updated[index] = true;
        return updated;
      });
    } else {
      setActiveFactors((prev) => {
        const updated = [...prev];
        updated[index] = updated[index] ?? false;
        return updated;
      });
    }
  };

  const getAvailableColumns = (currentColumn?: string) => {
    return columns.filter(
      (col) =>
        col.name === currentColumn ||
        (col.role === undefined && !selectedFactors.includes(col.name))
    );
  };

  const estimatedDateColumn = columns.find(
    (col) => col.role === "estimatedDate"
  );
  const actualDateColumn = columns.find((col) => col.role === "actualDate");
  const canRunAnalysis = estimatedDateColumn && actualDateColumn;

  const handleToggleActiveFactor = (index: number) => {
    setActiveFactors((prev) => {
      const updated = [...prev];
      const newValue = !(updated[index] ?? false);
      updated[index] = newValue;

      const columnName = selectedFactors[index];
      if (columnName) {
        updateColumnNumeric(columnName, newValue);
      }

      return updated;
    });
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
                      {columns
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
                      {columns
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
              {selectedFactors.map((factorColumn, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      onValueChange={(value) =>
                        updateFactorColumn(index, value)
                      }
                      value={factorColumn}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma coluna de fator" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableColumns(factorColumn).map((column) => (
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
                      checked={activeFactors[index] ?? false}
                      onChange={() => handleToggleActiveFactor(index)}
                      className="accent-primary h-4 w-4"
                    />
                    Numérico?
                  </label>
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
          <Button onClick={runAnalysis} disabled={isLoading || !canRunAnalysis}>
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
