import { useState } from "react";
import type { FilterOptions, FilterSelection } from "@/types";

interface FilterBarProps {
  options: FilterOptions;
  selection: FilterSelection;
  onChange: (next: FilterSelection) => void;
}

const FIELDS: { key: keyof FilterSelection; label: string }[] = [
  { key: "company", label: "Company" },
  { key: "division", label: "Division" },
  { key: "area", label: "Area" },
  { key: "district", label: "District" },
  { key: "store", label: "Store" },
  { key: "building", label: "Building" },
  { key: "region", label: "Region" },
  { key: "careStatus", label: "Care Status" },
];

/**
 * Barra de filtros multi-select en cascada. Recibe `options` y `selection` ya
 * resueltas por el padre (GET /api/filters, que recalcula las opciones restantes
 * en función de la selección actual — el backend decide la cascada, este
 * componente solo renderiza lo que recibe y notifica cambios).
 */
export function FilterBar({ options, selection, onChange }: FilterBarProps) {
  const [openField, setOpenField] = useState<keyof FilterSelection | null>(
    null
  );

  function toggleValue(field: keyof FilterSelection, value: string) {
    const current = selection[field];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...selection, [field]: next });
  }

  function clearField(field: keyof FilterSelection) {
    onChange({ ...selection, [field]: [] });
  }

  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 print:hidden">
      {FIELDS.map(({ key, label }) => {
        const values = options[key] ?? [];
        const selected = selection[key] ?? [];
        const isOpen = openField === key;
        return (
          <div key={key} className="relative">
            <button
              type="button"
              onClick={() => setOpenField(isOpen ? null : key)}
              className={`rounded border px-3 py-1.5 text-sm ${
                selected.length > 0
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {label}
              {selected.length > 0 ? ` (${selected.length})` : ""}
            </button>
            {isOpen && (
              <div className="absolute z-10 mt-1 max-h-64 w-56 overflow-auto rounded border border-gray-300 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b px-2 py-1 text-xs text-gray-500">
                  <span>{label}</span>
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => clearField(key)}
                  >
                    limpiar
                  </button>
                </div>
                {values.length === 0 && (
                  <div className="px-2 py-2 text-sm text-gray-400">
                    Sin opciones
                  </div>
                )}
                {values.map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(value)}
                      onChange={() => toggleValue(key, value)}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function emptyFilterSelection(): FilterSelection {
  return {
    company: [],
    division: [],
    area: [],
    district: [],
    store: [],
    building: [],
    region: [],
    careStatus: [],
  };
}
