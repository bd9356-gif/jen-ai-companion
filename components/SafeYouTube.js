"use client";

export default function SafeYouTube({ videoId }) {
  const src = `https://www.youtube.com/embed/${videoId}?controls=0&modestbranding=1&rel=0&showinfo=0&autohide=1`;

  return (
    <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%" }}>
      <iframe
        src={src}
        frameBorder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          borderRadius: "12px",
          overflow: "hidden"
        }}
      />
    </div>
  );
}
