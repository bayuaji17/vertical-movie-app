import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'

// Single 404 page for unknown routes and missing public content. It reads no
// session or settings, so the response is identical for anonymous and admin.
export function NotFoundPage() {
  // The root head owns the site title; set the 404 title once hydrated.
  useEffect(() => {
    document.title = 'Page not found'
  }, [])
  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6">
        <main
          id="main-content"
          className="flex w-full max-w-md flex-col items-center gap-6 text-center"
        >
          <p
            className="font-heading text-7xl font-bold tracking-tight text-muted-foreground sm:text-8xl"
            aria-hidden="true"
          >
            404
          </p>
          <div className="flex flex-col gap-3">
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Page not found
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              The page you are looking for does not exist or is no longer
              available.
            </p>
          </div>
          <Button
            size="lg"
            className="min-h-11"
            nativeButton={false}
            render={<Link to="/" />}
          >
            Back to home
          </Button>
        </main>
      </div>
    </>
  )
}
