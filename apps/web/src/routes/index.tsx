import { Button } from '#/components/ui/button'
import { VerticalVideoPlayer } from '#/components/vertical-video-player'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-4xl font-bold">Welcome to TanStack Start</h1>
      <p className="mt-4 text-lg">
        Edit <code>src/routes/index.tsx</code> to get started.
      </p>
      <Button>Click me</Button>
      <section
        className="mt-8 flex flex-col items-center gap-3"
        aria-labelledby="video-demo-title"
      >
        <h2 id="video-demo-title" className="text-xl font-semibold">
          Video demo
        </h2>
        <div className="w-full max-w-sm">
          <VerticalVideoPlayer src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4" />
        </div>
        <p className="text-sm text-muted-foreground">
          Video contoh untuk memeriksa pemutar.
        </p>
      </section>
    </div>
  )
}
