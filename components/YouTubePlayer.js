"use client";
import { useState } from "react";
export default function YouTubePlayer({ url }) {
  const [loaded, setLoaded] = useState(false);
  if (!url) return null;
  const getId = (u) => {
    try {
      const urlObj = new URL(u);
      if (urlObj.hostname.includes("youtu.be")) {
        return urlObj.pathname.slice(1);
      }
      return urlObj.searchParams.get("v") || "";
    } catch {
      return "";
    }
  };
  const id = getId(url);
  if (!id) return null;
  const embedUrl =
    `https://www.youtube.com/embed/${id}` +
    `?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&controls=1&fs=1`;
  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      {!loaded && (
        <div className="absolute inset-0 bg-gray-900 animate-pulse" />
      )}
      <iframe
        className="absolute inset-0 w-full h-full"
        src={embedUrl}
        title="YouTube video player"
        loading="lazy"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}