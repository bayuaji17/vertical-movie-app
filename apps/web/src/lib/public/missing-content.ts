// API answers 404 for absent/hidden content and 422 for malformed slugs; both
// render the shared not-found page. 503/network failures keep their retry UI.
export const isMissingContent = (status: number | null | undefined) =>
  status === 404 || status === 422
