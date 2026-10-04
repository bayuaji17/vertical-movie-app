import { useCallback, useEffect, useRef, useState } from 'react'
import { Video, videoFeatures } from '@videojs/react/video'
import { createPlayer, selectQuality, selectError } from '@videojs/react'
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video'
import { VideoSkin } from '#/components/videojs/video/skin'

const { Player: VideoPlayer, usePlayer } = createPlayer({
  features: videoFeatures,
})

export type PlaybackInfo = {
  videoId: string
  title: string
  durationMs: number
  masterUrl: string
  posterUrl: string
  expiresAt: string
}
interface VerticalVideoPlayerProps {
  src?: string
  poster?: string
  loadPlayback?: () => Promise<PlaybackInfo>
}
function PlaybackObserver({
  onQuality,
  onFailure,
}: {
  onQuality: () => void
  onFailure: () => void
}) {
  const quality = usePlayer(selectQuality)
  const selection = quality?.videoRenditionList
    .filter((r) => r.selected)
    .map((r) => r.id)
    .join(',')
  const failure = usePlayer(selectError)?.error
  useEffect(() => {
    onQuality()
  }, [selection, onQuality])
  useEffect(() => {
    if (failure) onFailure()
  }, [failure, onFailure])
  return null
}
export function VerticalVideoPlayer({
  src,
  poster,
  loadPlayback,
}: VerticalVideoPlayerProps) {
  const [playback, setPlayback] = useState<PlaybackInfo>(),
    [generation, setGeneration] = useState(0),
    [error, setError] = useState<string>()
  const media = useRef<HTMLVideoElement>(null),
    mounted = useRef(false),
    busy = useRef<number | null>(null),
    epoch = useRef(0),
    requests = useRef(0),
    terminal = useRef(false),
    attempts = useRef(0),
    expires = useRef(0),
    restore = useRef<{ position: number; paused: boolean } | null>(null)
  const renew = useCallback(async () => {
    if (!loadPlayback || busy.current || terminal.current) return
    if (attempts.current >= 2) {
      terminal.current = true
      setError(
        'Video tidak dapat diputar. Muat ulang halaman untuk mencoba kembali.',
      )
      return
    }
    const currentEpoch = epoch.current,
      request = ++requests.current
    busy.current = request
    attempts.current++
    try {
      const next = await loadPlayback()
      if (!mounted.current || currentEpoch !== epoch.current) return
      const value = media.current
      if (value)
        restore.current = { position: value.currentTime, paused: value.paused }
      const deadline = Date.parse(next.expiresAt)
      if (!Number.isFinite(deadline) || deadline <= Date.now())
        throw new Error('Invalid playback lifetime')
      expires.current = deadline
      setPlayback(next)
      setGeneration((n) => n + 1)
      setError(undefined)
    } catch {
      if (mounted.current && currentEpoch === epoch.current) {
        terminal.current = true
        media.current?.pause()
        setError(
          'Video tidak tersedia. Muat ulang halaman untuk mencoba kembali.',
        )
      }
    } finally {
      if (busy.current === request) busy.current = null
    }
  }, [loadPlayback])
  useEffect(() => {
    mounted.current = true
    epoch.current++
    busy.current = null
    terminal.current = false
    attempts.current = 0
    expires.current = 0
    restore.current = null
    if (loadPlayback) void renew()
    return () => {
      mounted.current = false
    }
  }, [loadPlayback, renew])
  useEffect(() => {
    if (!playback || !loadPlayback) return
    const remaining = Date.parse(playback.expiresAt) - Date.now(),
      margin = Math.min(5000, Math.max(200, remaining / 10))
    const timeout = setTimeout(
      () => {
        if (media.current && !media.current.paused && !media.current.ended)
          void renew()
      },
      Math.max(0, remaining - margin),
    )
    return () => clearTimeout(timeout)
  }, [playback, loadPlayback, renew])
  const checkExpiry = useCallback(() => {
    if (loadPlayback && expires.current && Date.now() >= expires.current - 200)
      void renew()
  }, [loadPlayback, renew])
  const loaded = () => {
    const value = media.current,
      snapshot = restore.current
    if (!value || !snapshot) return
    restore.current = null
    value.currentTime = Math.min(
      snapshot.position,
      Math.max(0, value.duration - 0.05),
    )
    if (snapshot.paused) value.pause()
    else void value.play().catch(() => undefined)
  }
  const playable = () => {
    attempts.current = 0
  }
  const failed = useCallback(() => {
    if (loadPlayback && Date.now() >= expires.current - 1000) void renew()
  }, [loadPlayback, renew])
  return (
    <div>
      <VideoPlayer>
        {loadPlayback && (
          <PlaybackObserver onQuality={checkExpiry} onFailure={failed} />
        )}
        <VideoSkin className="aspect-[9/16] w-full" aria-label="Pemutar video">
          {loadPlayback ? (
            <HlsJsVideo
              ref={media}
              source={
                playback
                  ? {
                      src:
                        playback.masterUrl +
                        (playback.masterUrl.includes('?') ? '&' : '?') +
                        'renew=' +
                        generation,
                      type: 'application/vnd.apple.mpegurl',
                      preferPlayback: 'mse',
                    }
                  : null
              }
              poster={playback?.posterUrl}
              playsInline
              preload="metadata"
              onLoadedMetadata={loaded}
              onCanPlay={playable}
              onPlay={checkExpiry}
              onSeeking={checkExpiry}
              onError={failed}
            />
          ) : (
            <Video src={src} poster={poster} playsInline preload="metadata" />
          )}
        </VideoSkin>
      </VideoPlayer>
      {error && (
        <p role="alert" className="mt-3 text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
