"use client";

import PhoneInputLib from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: string;
  required?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  defaultCountry = "KE",
  required = false,
}: PhoneInputProps) {
  return (
    <PhoneInputLib
      international
      countryCallingCodeEditable={false}
      defaultCountry={defaultCountry as any}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      required={required}
      className="phone-input-wrapper"
    />
  );
}
