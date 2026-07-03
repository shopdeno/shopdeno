"use client";
import { useRouter, usePathname } from "next/navigation";

const SORT_OPTIONS = [
  { value: "NAME", label: "Name A–Z" },
  { value: "NAME_DESC", label: "Name Z–A" },
  { value: "DATE", label: "Newest" },
  { value: "PRICE", label: "Price: Low–High" },
  { value: "PRICE_DESC", label: "Price: High–Low" },
];

export function SortSelect({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <select
      value={current}
      onChange={(e) => router.push(`${pathname}?sort=${e.target.value}`)}
      className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 cursor-pointer"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
