import type { MediaKind } from './media-client'
import type { UploadManager } from './upload-manager'

type Selectable = Pick<UploadManager, 'select' | 'canStart' | 'start'>

// Select a file and start uploading it as soon as it passes the local checks.
// A rejected file (wrong format, too large) leaves nothing to start, so the
// manager's own error stays visible and no request is made.
export function selectAndStart(
  manager: Selectable,
  kind: MediaKind,
  file: File | undefined,
): boolean {
  if (!file) return false
  manager.select(kind, file)
  if (!manager.canStart(kind)) return false
  void manager.start(kind)
  return true
}
