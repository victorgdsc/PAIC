import React from "react";
import Select from "react-select";

type OptionType = string | { value: string; label: string };

interface SelectAutoProps {
  value: string | null;
  onChange: (value: string) => void;
  options: OptionType[];
  placeholder?: string;
  isDisabled?: boolean;
}

const SelectAuto: React.FC<SelectAutoProps> = ({ value, onChange, options, placeholder, isDisabled }) => {
  const selectOptions = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  return (
    <Select
      value={selectOptions.find((o) => o.value === value) || null}
      onChange={(selected) => onChange(selected?.value || "")}
      options={selectOptions}
      placeholder={placeholder}
      isClearable
      isSearchable
      isDisabled={isDisabled}
      styles={{
        menu: (base) => ({ ...base, zIndex: 9999 }),
      }}
      noOptionsMessage={() => "Nenhuma opção"}
      maxMenuHeight={220}
    />
  );
};

export default SelectAuto;
