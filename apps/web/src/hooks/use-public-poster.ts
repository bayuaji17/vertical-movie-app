import { useCallback, useEffect, useRef, useState } from 'react'
import { publicVideoBrowser } from '#/lib/public/catalog-reader'
import { PosterQueue } from '#/lib/public/poster-state'
import type { PublicVideo, SignedPoster } from '#/lib/public/catalog-model'
import { usePublicOnline } from './use-public-online'

let queue: PosterQueue | undefined
function browserQueue() {
  if (typeof window === 'undefined')
    throw new Error('Poster capabilities are browser-only.')
  return (queue ??= new PosterQueue((video, signal) =>
    publicVideoBrowser().poster(video, signal),
  ))
}
export function usePublicPoster(video: PublicVideo) {
  const ref = useRef<HTMLDivElement>(null),
    automatic = useRef(0)
  const [visible, setVisible] = useState(false),
    [revision, setRevision] = useState(0)
  const [packet, setPacket] = useState<SignedPoster | null>(null),
    [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false)
  const online = usePublicOnline()
  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        ([entry]) => setVisible(entry.isIntersecting),
        { rootMargin: '0px' },
      )
      observer.observe(element)
      return () => observer.disconnect()
    }
    const update = () => {
      const rect = element.getBoundingClientRect()
      setVisible(
        rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          rect.right > 0 &&
          rect.left < window.innerWidth,
      )
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  useEffect(() => {
    automatic.current = 0
    setPacket(null)
    setFailed(false)
  }, [video.id, video.slug])
  const renew = useCallback(() => {
    browserQueue().invalidate(video)
    setPacket(null)
    setFailed(false)
    setRevision((v) => v + 1)
  }, [video])
  useEffect(() => {
    if (!visible || !online) return
    const controller = new AbortController()
    setBusy(true)
    browserQueue()
      .request(video, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setPacket(value)
          setFailed(false)
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return
        if (automatic.current < 1) {
          automatic.current++
          renew()
        } else {
          setPacket(null)
          setFailed(true)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false)
      })
    return () => controller.abort()
  }, [visible, online, video, revision, renew])
  useEffect(() => {
    if (!visible || !packet) return
    const timer = setTimeout(
      () => {
        setPacket(null)
        if (online && automatic.current < 1) {
          automatic.current++
          renew()
        } else setFailed(true)
      },
      Math.max(0, Date.parse(packet.expiresAt) - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [visible, packet, online, renew])
  const onError = () => {
    setPacket(null)
    if (visible && online && automatic.current < 1) {
      automatic.current++
      renew()
    } else setFailed(true)
  }
  return {
    ref,
    source:
      packet?.videoId === video.id && Date.parse(packet.expiresAt) > Date.now()
        ? packet.posterUrl
        : undefined,
    failed: failed || !online,
    busy,
    onError,
    retry: () => {
      automatic.current = 0
      renew()
    },
  }
}
