import type { ClassValue } from 'cn'

export type ClassName<TState> = ClassValue | ((state: TState) => ClassValue)

export function resolveClassName<TState>(
  className: ClassName<TState>,
  state: TState,
): ClassValue {
  return typeof className === 'function' ? className(state) : className
}
