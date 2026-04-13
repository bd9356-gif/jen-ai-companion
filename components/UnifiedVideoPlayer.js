"use client";

import { useState, useRef } from "react";

export default function UnifiedVideoPlayer({ url, onClose }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!url) return null;

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");

  const getYouTubeEmbed = (u) => {
    const match = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    const id = match ? match[1] : "";
    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&controls=1&showinfo=0`;
  };

  const getVimeoEmbed = (u) => {
    const id = u.split("/").pop();
    return `https://player.vimeo.com/video/${id}?playsinline=1&title=0&byline=0&portrait=0&dnt=1`;
  };

  const renderIframe = () => {
    const commonProps = {
      className: "absolute inset-0 w-full h-full rounded-xl",
      allow: "autoplay; fullscreen; picture-in-picture",
      allowFullScreen: true,
      sandbox: "allow-scripts allow-same-origin",
      onLoad: () => setIsLoaded(true),
      onError: () => setHasError(true),
    };

    if (isYouTube) {
      return <iframe {...commonProps} src={getYouTubeEmbed(url)} />;
    }

    if (isVimeo) {
      return <iframe {...commonProps} src={getVimeoEmbed(url)} />;
    }

    return (
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full rounded-xl bg-black object-contain"
        onLoadedData={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    );
  };

  const isMP4 = !isYouTube && !isVimeo;
  const aspectRatio = isMP4 ? "50%" : "56.25%";

  return (
    <div className="w-full bg-black rounded-2xl overflow-hidden relative">
      <div className="relative w-full" style={{ paddingBottom: aspectRatio }}>

        {!isPlaying && !hasError && (
          <button
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm text-white"
          >
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white" style={{ marginLeft: "4px" }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="mt-3 text-sm opacity-80">Tap to watch</p>
          </button>
        )}

        {isPlaying && !isLoaded && !hasError && (
          <div className="absolute inset-0 z-10 animate-pulse bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl" />
        )}

        {hasError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black text-white">
            <p className="text-sm opacity-80 mb-3">Video unavailable</p>
            <button
              onClick={() => { setHasError(false); setIsPlaying(false); setIsLoaded(false); }}
              className="px-4 py-2 bg-white/10 rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {isPlaying && renderIframe()}

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-11 h-11 flex items-center justify-center text-lg font-bold z-30"
          >
            ✕
          </button>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-900 text-white text-sm font-semibold text-center"
        >
          ✕ Close Video
        </button>
      )}
    </div>
  );
}