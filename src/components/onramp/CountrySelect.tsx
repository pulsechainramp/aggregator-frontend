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
  const widthClass = className?.match(/\bw-\S+/) ? "" : "w-56";

  return (
    <div className="relative inline-block w-full">
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`touch-target ${widthClass} appearance-none rounded-lg border border-border bg-bg-surface px-3 py-2 pr-12 text-sm font-medium text-text transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${className}`}
      >
        {merged.map(({ code, name: optionName }) => (
          <option key={code} value={code}>
            {optionName} ({code})
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5 sm:h-6 sm:w-6"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 7.97a.75.75 0 0 1 1.06.02L10 11.06l3.72-3.07a.75.75 0 0 1 .94 1.16l-4.25 3.5a.75.75 0 0 1-.94 0l-4.25-3.5a.75.75 0 0 1 .02-1.18Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </div>
  );
}
