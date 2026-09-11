"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const VIDEOS = [
  { src: "/hero-1.mp4", label: "Our Story", sub: "The Crispo way" },
  { src: "/hero-2.mp4", label: "The Bake", sub: "Fresh from the oven" },
];

/**
 * Full-frame video player — shows the ENTIRE video, never a cropped cover.
 * The 16:9 frame keeps its aspect ratio, so a 16:9 clip fills it edge to
 * edge with no letterbox. Videos load lazily (preload="none") and only play
 * after the visitor taps play, exactly like a YouTube watch page.
 */
export default function HeroVideo({ className }: { className?: string }) {
  const [active, setActive] = useState(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const switchVideo = (index: number) => {
    if (index === active) return;
    setActive(index);
    setStarted(false);
    setPlaying(false);
  };

  const startPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play().then(
      () => {
        setStarted(true);
        setPlaying(true);
      },
      () => {
        // Autoplay/policy or preload failure — leave the overlay usable.
      }
    );
  };

  const resetToOverlay = () => {
    setStarted(false);
    setPlaying(false);
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl overflow-hidden shadow-lift ring-1 ring-white/20 bg-black",
        className
      )}
    >
      {/* Player stage */}
      <div className="relative bg-black">
        <video
          key={VIDEOS[active].src}
          ref={videoRef}
          className="block w-full h-auto"
          style={{ aspectRatio: "16 / 9" }}
          controls
          playsInline
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={resetToOverlay}
        >
          <source src={VIDEOS[active].src} type="video/mp4" />
        </video>

        {/* Branded overlay before first play (acts as the poster) */}
        {!started && (
          <button
            type="button"
            onClick={startPlayback}
            aria-label={`Play video: ${VIDEOS[active].label}`}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-plum/70 via-royal/70 to-espresso/80 cursor-pointer group"
          >
            <span className="flex items-center justify-center w-20 h-20 rounded-full bg-cream/95 text-royal shadow-xl group-hover:scale-110 transition-transform duration-300">
              <Play
                size={34}
                fill="currentColor"
                className="ml-1"
                aria-hidden="true"
              />
            </span>
            <span className="text-cream font-heading font-bold text-lg tracking-wide">
              {VIDEOS[active].label}
            </span>
            <span className="text-cream/70 text-xs tracking-widest uppercase">
              {VIDEOS[active].sub}
            </span>
            {playing && (
              <span className="absolute bottom-4 right-4 text-cream/60">
                <Pause size={18} aria-hidden="true" />
              </span>
            )}
          </button>
        )}
      </div>

      {/* Video switcher */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-plum/5">
        {VIDEOS.map((video, i) => (
          <button
            key={video.src}
            type="button"
            onClick={() => switchVideo(i)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer",
              active === i
                ? "bg-gold text-royal shadow"
                : "text-royal/60 hover:text-royal bg-transparent"
            )}
          >
            {video.label}
          </button>
        ))}
      </div>
    </div>
  );
}