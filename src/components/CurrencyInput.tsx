import React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Helper for formatting currency string in real time (e.g. 150000 -> 150.000) */
export function formatNumberWithThousandSeparators(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "";
  const num = typeof val === "string" ? parseFloat(val.replace(/\D/g, "")) : val;
  if (isNaN(num)) return "";
  return num.toLocaleString("id-ID");
}

/** Helper component for currency input with "Rp" prefix and thousand separators */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  className = "",
  disabled = false,
  id,
}: {
  value: number | "";
  onChange: (val: number | "") => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}) {
  const displayValue = formatNumberWithThousandSeparators(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    if (!rawDigits) {
      onChange("");
    } else {
      const parsed = parseInt(rawDigits, 10);
      onChange(isNaN(parsed) ? "" : parsed);
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <span className="absolute left-2.5 text-xs text-muted-foreground font-medium pointer-events-none select-none">
        Rp
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        className={cn("pl-8 text-xs font-mono tabular-nums", className)}
      />
    </div>
  );
}
