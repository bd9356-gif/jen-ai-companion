"use client";

export default function SafeYouTube({ videoId, onClose }) {
  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0`;

  return (
    <div className="relative w-full bg-black" style={{paddingBottom: '56.25%'}}>
      <iframe
        src={src}
        frameBorder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin"
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      />
      {onClose && (
        <>
          <button onClick={onClose}
            className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-11 h-11 flex items-center justify-center text-lg font-bold z-10">✕</button>
          <button onClick={onClose}
            className="absolute bottom-0 left-0 right-0 py-4 bg-gray-900 text-white text-sm font-bold text-center z-10">
            ✕ Close Video
          </button>
        </>
      )}
    </div>
  );
}