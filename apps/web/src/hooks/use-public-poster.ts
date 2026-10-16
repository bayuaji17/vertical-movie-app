import { useCallback, useEffect, useRef, useState } from 'react'
import { publicVideoBrowser } from '#/lib/public/catalog-reader'
import { PosterQueue } from '#/lib/public/poster-state'
import { PosterController } from '#/lib/public/poster-controller'
import type { PosterView } from '#/lib/public/poster-controller'
import type { PublicVideo } from '#/lib/public/catalog-model'
import { usePublicOnline } from './use-public-online'

let queue: PosterQueue | undefined
function browserQueue() {
  if (typeof window === 'undefined')
    throw new Error('Poster capabilities are browser-only.')
  return (queue ??= new PosterQueue((video, signal) =>
    publicVideoBrowser().poster(video, signal),
  ))
}
function preloadImage(url: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image()
    const stop = () => {
      image.onload = image.onerror = null
      image.src = ''
      reject(signal.reason ?? new Error('aborted'))
    }
    if (signal.aborted) return stop()
    signal.addEventListener('abort', stop, { once: true })
    image.onload = () => {
      signal.removeEventListener('abort', stop)
      resolve()
    }
    image.onerror = () => {
      signal.removeEventListener('abort', stop)
      reject(new Error('Poster image failed to load.'))
    }
    image.src = url
  })
}
const start: PosterView = { src: undefined, failed: false, busy: false }

/**
 * The poster of a video page. Its URL is temporary, but a poster that is on
 * screen is never removed: new URLs are fetched and preloaded in the background.
 */
export function usePublicPoster(video: PublicVideo) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false),
    [view, setView] = useState<PosterView>(start)
  const online = usePublicOnline()
  // Created in an effect so every mount gets a live controller (React may mount,
  // clean up and mount again; a disposed controller must never be reused).
  const [controller, setController] = useState<PosterController>()
  useEffect(() => {
    const next = new PosterController({
      request: (signal) => {
        // Always a fresh URL: the cached one is what is about to expire.
        browserQueue().invalidate(video)
        return browserQueue().request(video, signal)
      },
      preload: preloadImage,
      onChange: setView,
    })
    setView(start)
    setController(next)
    return () => {
      next.dispose()
      setController(undefined)
    }
  }, [video])
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
    controller?.setActive(visible && online)
  }, [controller, visible, online])
  // Coming back to the tab or the network may mean the URL needs renewing.
  useEffect(() => {
    if (!controller) return
    const check = () => {
      if (document.visibilityState === 'visible') controller.check()
    }
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [controller])
  const onError = useCallback(() => controller?.imageFailed(), [controller])
  const retry = useCallback(() => controller?.retry(), [controller])
  return {
    ref,
    source: view.src,
    failed: view.failed || (!view.src && !online),
    busy: view.busy,
    onError,
    retry,
  }
}
