'use client'
import { useState } from 'react'

// Saved cooking video row with click-to-play thumbnail.
// Used by /skills (bucketed) and anywhere a saved video needs to show.
export default function VideoItem({ video, onRemove }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="bg-white">
      {playing ? (
        <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; encrypted-media; gyroscope"
            sandbox="allow-scripts allow-same-origin"
          />
          <button
            onClick={() => setPlaying(false)}
            className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold z-10"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 hover:bg-gray-50">
          <button onClick={() => setPlaying(true)} title="Play skill video" className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
              alt={video.title}
              className="w-16 h-12 rounded-xl object-cover"
            />
            <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center">
              <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 ml-0.5" fill="#dc2626">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{video.title}</p>
            <p className="text-xs text-orange-600">{video.channel}</p>
          </div>
          {onRemove && (
            <button onClick={onRemove} title="Remove saved video" className="shrink-0 text-gray-300 hover:text-red-400 text-xl">×</button>
          )}
        </div>
      )}
    </div>
  )
}
