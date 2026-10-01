import { Video, VideoPlayer } from '@videojs/react/video'

import { VideoSkin } from '#/components/videojs/video/skin'

interface VerticalVideoPlayerProps {
  src: string
  poster?: string
}

export function VerticalVideoPlayer({ src, poster }: VerticalVideoPlayerProps) {
  return (
    <VideoPlayer>
      <VideoSkin className="aspect-[9/16] w-full" aria-label="Pemutar video">
        <Video src={src} poster={poster} playsInline preload="metadata" />
      </VideoSkin>
    </VideoPlayer>
  )
}
