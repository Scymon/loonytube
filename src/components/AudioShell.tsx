"use client";
import { AudioProvider } from "@/contexts/AudioContext";
import MiniPlayer from "@/components/audio/MiniPlayer";
import PersistentMiniVideo from "@/components/video/PersistentMiniVideo";

export default function AudioShell({ children }: { children: React.ReactNode }) {
  return (
    <AudioProvider>
      <MiniPlayer />
      <PersistentMiniVideo />
      {children}
    </AudioProvider>
  );
}
