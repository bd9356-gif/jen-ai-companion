"use client";

import { useState, memo } from "react";

function UnifiedVideoPlayer({ url, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!url) return null;

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");
  const isMp4 = url.endsWith(".mp4") || url.includes("amazonaws.com");

  const getYouTubeEmbed = (u) => {
    try {
      const urlObj = new URL(u);
      if (urlObj.hostname.includes("youtu.be")) {
        const id = urlObj.pathname.slice(1);
        return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;
      }
      const v = urlObj.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;
      const parts = urlObj.pathname.split("/");
      const id = parts.filter(Boolean).pop();
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;
    } catch { return ""; }
  };

  const getVimeoEmbed = (u) => {
    const match = u.match(/vimeo\.com\/(\d+)/);
    const id = match ? match[1] : "";
    return `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&playsinline=1`;
  };

  const renderPlayer = () => {
    if (isYouTube || isVimeo) {
      const src = isYouTube ? getYouTubeEmbed(url) : getVimeoEmbed(url);
      if (!src) { setHasError(true); return null; }
      return (
        <iframe
          className="absolute inset-0 w-full h-full rounded-xl"
          src={src}
          loading="lazy"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => setIsLoaded(true)}
        />
      );
    }
    if (isMp4) {
      return (
        <video
          className="absolute inset-0 w-full h-full rounded-xl object-contain"
          src={url}
          playsInline
          autoPlay
          muted
          controls
          preload="metadata"
          onLoadedData={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      );
    }
    setHasError(true);
    return null;
  };

  return (
    <div className="w-full bg-black rounded-2xl overflow-hidden relative">
      <div className="relative w-full aspect-video">
        {!isPlaying && !hasError && (
          <button
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm text-white w-full h-full"
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
            >Retry</button>
          </div>
        )}
        {isPlaying && !hasError && renderPlayer()}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-11 h-11 flex items-center justify-center text-lg font-bold z-30"
          >✕</button>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-900 text-white text-sm font-semibold text-center"
        >✕ Close Video</button>
      )}
    </div>
  );
}

export default memo(UnifiedVideoPlayer);