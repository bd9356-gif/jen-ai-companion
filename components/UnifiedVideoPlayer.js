"use client";

import { useEffect, useRef } from "react";

export default function UnifiedVideoPlayer({ url, onClose }) {
  const videoRef = useRef(null);

  if (!url) return null;

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");
  const isHLS = url.endsWith(".m3u8");
  const isMp4 = !isYouTube && !isVimeo && (
    url.match(/\.(mp4|mov|webm|m4v)/i) ||
    url.includes("s3.amazonaws.com") ||
    url.includes("supabase") ||
    url.includes("firebasestorage")
  );

  // YouTube embed URL
  const getYouTubeEmbed = (u) => {
    const match = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    const id = match ? match[1] : u.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")
    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&controls=0&autohide=1&showinfo=0`
  }

  const renderPlayer = () => {
    if (isYouTube) {
      return (
        <iframe
          src={getYouTubeEmbed(url)}
          className="absolute inset-0 w-full h-full rounded-xl"
          allow="accelerometer; autoplay; encrypted-media; gyroscope"
          sandbox="allow-scripts allow-same-origin"
        />
      )
    }

    if (isVimeo) {
      const id = url.split("/").pop()
      return (
        <iframe
          src={`https://player.vimeo.com/video/${id}?playsinline=1`}
          className="absolute inset-0 w-full h-full rounded-xl"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      )
    }

    // MP4 / MOV / S3 / HLS / everything else
    return (
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full rounded-xl bg-black object-contain"
      />
    )
  }

  return (
    <div className="w-full bg-black rounded-2xl overflow-hidden">
      <div className="relative w-full" style={{paddingBottom: '56.25%'}}>
        {renderPlayer()}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-11 h-11 flex items-center justify-center text-lg font-bold z-10">
            ✕
          </button>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-900 text-white text-sm font-semibold text-center">
          ✕ Close Video
        </button>
      )}
    </div>
  )
}