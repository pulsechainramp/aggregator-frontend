import React from "react";
import { COUNTRY_OPTIONS, CountryOption } from "../../data/countries";

type Props = {
  value: string;
  onChange: (code: string) => void;
  options?: CountryOption[]; // optional override
  className?: string;
};

export default function CountrySelect({ value, onChange, options = COUNTRY_OPTIONS, className = "" }: Props) {
  const hasValue = options.some(o => o.code === value);
  const merged = hasValue ? options : [{ code: value, name: `(${value})` }, ...options];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`
        w-56 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
        focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}
      `}
    >
      {merged.map(({ code, name }) => (
        <option key={code} value={code} className="bg-[#151528] text-white">
          {name} ({code})
        </option>
      ))}
    </select>
  );
}
