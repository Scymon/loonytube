"use client";
import { useEffect, useRef, useState } from "react";

export type OSDMessage = { text: string; id: number };

export default function PlayerOSD({ message }: { message: OSDMessage | null }) {
  const [shown, setShown] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const fade  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    setShown(message.text);
    setVisible(true);
    if (fade.current)  clearTimeout(fade.current);
    if (clear.current) clearTimeout(clear.current);
    fade.current  = setTimeout(() => setVisible(false), 700);
    clear.current = setTimeout(() => setShown(null),    1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message?.id]);

  if (!shown) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="rounded-xl bg-black/70 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm select-none">
        {shown}
      </div>
    </div>
  );
}
