"use client";

import { useEffect, useRef } from "react";

// Auto-growing textarea used for the title and every text-like block.
export default function AutoText({
  value, onChange, placeholder, className, onEnter, onFocus, onBlur,
  refCallback, onKeyDown, onPaste,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  onEnter?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  refCallback?: (el: HTMLTextAreaElement | null) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  return (
    <textarea
      ref={(el) => {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
        refCallback?.(el);
      }}
      value={value}
      rows={1}
      placeholder={placeholder}
      className={className}
      style={{ resize: "none", overflow: "hidden" }}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      onPaste={onPaste}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && onEnter) {
          e.preventDefault();
          onEnter();
          return;
        }
        onKeyDown?.(e);
      }}
    />
  );
}
