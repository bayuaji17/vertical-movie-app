import type { MediaOwner } from './media-client'
import type { QueryClient } from '@tanstack/react-query'
import type { UploadManager } from './upload-manager'

type Registry = {
  managers: Set<UploadManager>
  listeners: Set<() => void>
  revision: number
}
const registries = new WeakMap<QueryClient, Registry>()
function registry(cache: QueryClient) {
  let value = registries.get(cache)
  if (!value) {
    value = { managers: new Set(), listeners: new Set(), revision: 0 }
    registries.set(cache, value)
  }
  return value
}
export function notifyUploadState(cache: QueryClient) {
  const state = registry(cache)
  state.revision++
  for (const notify of state.listeners) notify()
}
export function registerUploadManager(
  cache: QueryClient,
  manager: UploadManager,
) {
  registry(cache).managers.add(manager)
  notifyUploadState(cache)
  return () => {
    registry(cache).managers.delete(manager)
    notifyUploadState(cache)
  }
}
export function subscribeUploads(cache: QueryClient, notify: () => void) {
  registry(cache).listeners.add(notify)
  return () => {
    registry(cache).listeners.delete(notify)
  }
}
export function uploadRevision(cache: QueryClient) {
  return registry(cache).revision
}
export function hasWorkingUploads(cache: QueryClient, owner?: MediaOwner) {
  return Array.from(registry(cache).managers).some(
    (manager) => (!owner || manager.owns(owner)) && manager.working(),
  )
}
export function pauseUploads(cache: QueryClient) {
  for (const manager of registry(cache).managers) manager.pause()
}
