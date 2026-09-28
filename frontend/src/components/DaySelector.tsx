import type { DayInfo } from "@/types";

interface DaySelectorProps {
  days: DayInfo[];
  value: string;
  onChange: (value: string) => void;
}

export function DaySelector({ days, value, onChange }: DaySelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-gray-300 px-2 py-1.5 text-sm print:hidden"
    >
      {days.map((day) => (
        <option key={day.bsc_fecha} value={day.bsc_fecha}>
          {day.label}
        </option>
      ))}
    </select>
  );
}
