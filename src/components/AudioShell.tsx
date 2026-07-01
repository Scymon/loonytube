"use client";
import { AudioProvider } from "@/contexts/AudioContext";
import MiniPlayer from "@/components/audio/MiniPlayer";

export default function AudioShell({ children }: { children: React.ReactNode }) {
  return (
    <AudioProvider>
      <MiniPlayer />
      {children}
    </AudioProvider>
  );
}
