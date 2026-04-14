"use client";
export default function SafeYouTube({ videoId, onClose }) {
  const src = `https://www.youtube.com/embed/${videoId}?controls=0&modestbranding=1&rel=0&showinfo=0&autohide=1&iv_load_policy=3&fs=0&disablekb=1&playlist=${videoId}&loop=1`;
  return (
    <div
      className="relative w-full bg-black rounded-2xl overflow-hidden"
      style={{ paddingBottom: "56.25%" }}
    >
      <iframe
        src={src}
        frameBorder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: "none",
        }}
      />
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-11 h-11 flex items-center justify-center text-lg font-bold z-10"
        >
          ✕
        </button>
      )}
    </div>
  );
}