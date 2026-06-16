"use client";

import { useState } from "react";

function score(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}
const LABELS = ["", "Weak", "Fair", "Good", "Strong"];

export default function PasswordField({
  value,
  onChange,
  placeholder = "Password",
  meter = false,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  meter?: boolean;
  onEnter?: () => void;
}) {
  const [show, setShow] = useState(false);
  const s = score(value);

  return (
    <div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          placeholder={placeholder}
          className="lt-input pr-11"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-foam"
        >
          {show ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
              <path d="M9.4 5.2A9.6 9.6 0 0112 5c5 0 9 4.5 9 7-.4 1-1.3 2.3-2.6 3.4M6.1 6.1C3.9 7.4 2.4 9.4 2 12c.6 1.6 2 3.6 4 5" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
          )}
        </button>
      </div>

      {meter && value.length > 0 && (
        <div className="mt-2 flex items-center gap-3">
          <div className="flex flex-1 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{ background: i < s ? "#2dd4b4" : "#242833" }}
              />
            ))}
          </div>
          <span className="text-[12px] font-semibold text-teal">{LABELS[s]} Password</span>
        </div>
      )}
    </div>
  );
}
