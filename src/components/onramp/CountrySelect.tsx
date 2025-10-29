import React from "react";
import { COUNTRY_OPTIONS, CountryOption } from "../../data/countries";

type Props = {
  value: string;
  onChange: (code: string) => void;
  options?: CountryOption[];
  className?: string;
  id?: string;
  name?: string;
};

export default function CountrySelect({
  value,
  onChange,
  options = COUNTRY_OPTIONS,
  className = "",
  id,
  name,
}: Props) {
  const hasValue = options.some((option) => option.code === value);
  const merged = hasValue
    ? options
    : [{ code: value, name: `(${value})` }, ...options];

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`touch-target w-56 rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm font-medium text-text transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${className}`}
    >
      {merged.map(({ code, name: optionName }) => (
        <option key={code} value={code}>
          {optionName} ({code})
        </option>
      ))}
    </select>
  );
}
