# Atlas warna final

Dihasilkan dari `apps/web/src/styles.css` menggunakan `bun docs/design/build-design-system.mjs`. Seluruh 31 variabel warna shadcn dengan nilai literal CSS.

| Variabel | Light (:root) | Dark (.dark) |
| --- | --- | --- |
| `--background` | `oklch(1 0 0)` | `#1e201e` |
| `--foreground` | `oklch(0.145 0 0)` | `#f3f5f3` |
| `--card` | `oklch(1 0 0)` | `#272a27` |
| `--card-foreground` | `oklch(0.145 0 0)` | `#f3f5f3` |
| `--popover` | `oklch(1 0 0)` | `#272a27` |
| `--popover-foreground` | `oklch(0.145 0 0)` | `#f3f5f3` |
| `--primary` | `oklch(0.841 0.238 128.85)` | `oklch(0.768 0.233 130.85)` |
| `--primary-foreground` | `oklch(0.405 0.101 131.063)` | `oklch(0.405 0.101 131.063)` |
| `--secondary` | `oklch(0.967 0.001 286.375)` | `#303430` |
| `--secondary-foreground` | `oklch(0.21 0.006 285.885)` | `#f3f5f3` |
| `--muted` | `oklch(0.97 0 0)` | `#303430` |
| `--muted-foreground` | `oklch(0.556 0 0)` | `#a8b0a8` |
| `--accent` | `oklch(0.97 0 0)` | `#303430` |
| `--accent-foreground` | `oklch(0.205 0 0)` | `#f3f5f3` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |
| `--border` | `oklch(0.922 0 0)` | `#424842` |
| `--input` | `oklch(0.922 0 0)` | `#303430` |
| `--ring` | `oklch(0.708 0 0)` | `#a8b0a8` |
| `--chart-1` | `oklch(0.87 0 0)` | `oklch(0.87 0 0)` |
| `--chart-2` | `oklch(0.556 0 0)` | `oklch(0.556 0 0)` |
| `--chart-3` | `oklch(0.439 0 0)` | `oklch(0.439 0 0)` |
| `--chart-4` | `oklch(0.371 0 0)` | `oklch(0.371 0 0)` |
| `--chart-5` | `oklch(0.269 0 0)` | `oklch(0.269 0 0)` |
| `--sidebar` | `oklch(0.985 0 0)` | `#272a27` |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | `#f3f5f3` |
| `--sidebar-primary` | `oklch(0.648 0.2 131.684)` | `oklch(0.768 0.233 130.85)` |
| `--sidebar-primary-foreground` | `oklch(0.986 0.031 120.757)` | `oklch(0.274 0.072 132.109)` |
| `--sidebar-accent` | `oklch(0.97 0 0)` | `#303430` |
| `--sidebar-accent-foreground` | `oklch(0.205 0 0)` | `#f3f5f3` |
| `--sidebar-border` | `oklch(0.922 0 0)` | `#424842` |
| `--sidebar-ring` | `oklch(0.708 0 0)` | `#a8b0a8` |

## Alias warna media

15 alias tambahan di `@theme inline` bergantung pada theme runtime Video.js di dalam player. Variabel ini tidak mempunyai nilai literal pada `:root`/`.dark` aplikasi; jangan menganggapnya token global atau mewarnai swatch tanpa scope player. Alias dipertahankan tanpa perubahan.

| Alias Tailwind | Variabel runtime player |
| --- | --- |
| `--color-media-accent` | `--media-accent` |
| `--color-media-background` | `--media-background` |
| `--color-media-border` | `--media-border` |
| `--color-media-controls` | `--media-controls` |
| `--color-media-controls-foreground` | `--media-controls-foreground` |
| `--color-media-foreground` | `--media-foreground` |
| `--color-media-live` | `--media-live-color` |
| `--color-media-muted` | `--media-muted` |
| `--color-media-muted-foreground` | `--media-muted-foreground` |
| `--color-media-popover` | `--media-popover` |
| `--color-media-popover-foreground` | `--media-popover-foreground` |
| `--color-media-primary` | `--media-primary` |
| `--color-media-primary-foreground` | `--media-primary-foreground` |
| `--color-media-ring` | `--media-ring` |
| `--color-media-backdrop` | `--media-backdrop` |
