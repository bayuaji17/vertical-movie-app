export const themeStorageKey = 'vertical-movie-theme'
export type ThemeMode = 'light' | 'dark' | 'system'
export function themeMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' ? value : 'system'
}
export function resolveTheme(mode: ThemeMode, systemDark: boolean) {
  return mode === 'system' ? (systemDark ? 'dark' : 'light') : mode
}
/** Runs in head before CSS/React. Keep bootstrap self-contained and free of private data. */
export const themeBootstrap = `(()=>{let m='system';try{const v=localStorage.getItem('vertical-movie-theme');if(v==='light'||v==='dark')m=v}catch{}const d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);const e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';e.dataset.themeMode=m})()`
