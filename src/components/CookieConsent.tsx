"use client";

// ponytail: localStorage only — upgrade to a real consent platform when analytics are wired
import { useState, useEffect } from "react";
import Link from "next/link";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie-consent")) setVisible(true);
  }, []);

  const dismiss = (value: "accepted" | "rejected") => {
    localStorage.setItem("cookie-consent", value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-gray-300 flex-1">
          We use essential cookies to keep the site working and your cart saved.{" "}
          <Link href="/cookies-policy" className="underline text-indigo-400 hover:text-indigo-300">
            Learn more
          </Link>
        </p>
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={() => dismiss("rejected")}
            className="px-4 py-2 text-sm rounded-md border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Reject non-essential
          </button>
          <button
            onClick={() => dismiss("accepted")}
            className="px-4 py-2 text-sm rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
