import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface ColumnNumericToggleProps {
  column: {
    name: string;
    label: string;
    type: string;
    isNumeric?: boolean;
  };
  onToggle: (columnName: string, isNumeric: boolean) => void;
}

const ColumnNumericToggle: React.FC<ColumnNumericToggleProps> = ({
  column,
  onToggle,
}) => {
  const handleToggle = (checked: boolean) => {
    onToggle(column.name, checked);
  };

  return (
    <div className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md">
      <Checkbox
        id={`numeric-${column.name}`}
        checked={column.isNumeric || false}
        onCheckedChange={handleToggle}
        className="h-4 w-4"
      />
      <Label htmlFor={`numeric-${column.name}`} className="text-sm font-medium">
        {column.label}{" "}
        <span className="text-muted-foreground text-xs">({column.type})</span>
      </Label>
    </div>
  );
};

export default ColumnNumericToggle;
