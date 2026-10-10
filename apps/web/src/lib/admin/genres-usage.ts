export const usageLabel = (count: number) =>
  count === 0
    ? 'Not used yet'
    : `Used by ${count} ${count === 1 ? 'item' : 'items'}`
// A genre that content still carries cannot be deleted; the API refuses too.
export const canDeleteGenre = (canEdit: boolean, usageCount: number) =>
  canEdit && usageCount === 0
