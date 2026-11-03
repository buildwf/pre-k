# pre-k design system

pre-k is built on [sevenyears](https://github.com/buildwf/sevenyears), Zack's component system: shadcn's component
set and API on Base UI primitives, styled with StyleX, zinc with a violet primary, Geist type. Every screen is made from
the components in `app/ui/`, which are sevenyears components (or follow its tokens where they can't be). Screens never
style anything themselves.

## How sevenyears gets into the app

- `package.json` depends on `sevenyears` as `file:../sevenyears` (a checkout next to pre-k, like `../cloudflare-point`).
  After pulling sevenyears, run `bun install` again: a `file:` dependency is a copy.
- `point.vite.ts` adds the StyleX plugin to the renderer build and keeps one React, StyleX and Base UI. `.storybook/main.ts`
  reuses it, so stories render the same.
- `app/ui/` imports sevenyears by path (`sevenyears/src/components/Button`, `sevenyears/src/tokens.stylex`).
- `app/ui/kit.css` carries the same palette as CSS variables (`--ui-*`), for the kit components that aren't on StyleX
  yet. Geist and Geist Mono are bundled in `app/ui/fonts/` (OFL).
- **Anything `app/components/` imports must not use StyleX** (today: `Card`, `Text`). Point loads agent components
  outside the renderer build, where StyleX isn't compiled, and the agents daemon then fails with "agents restarted".

## Layout

One window, three columns (`AppShell`):

| Column | Component | What it holds |
| --- | --- | --- |
| Sidebar, 248px | `Sidebar`, `SidebarGroup`, `SidebarItem` | Project switcher (`Menu` + `Mark`), Project chat, Delivered, Threads (a `StatusDot` and the state word each), Project settings at the bottom |
| Main | `PaneHeader`, `PaneBody`, `PaneFooter` | The open view: project chat, a thread, Delivered, or Project settings. The header has the title, a `Badge`, a muted subtitle and actions; the body is a centered 736px reading column that scrolls; the footer holds the `Composer` |
| Panel, 320px | `Section compact` | Beside the project chat only: the project's instructions (Edit opens settings) and memory. Toggled from the chat header |

Project settings is a view, not a disclosure: one `Section` per topic (GitHub, Repository, General, Memory, You),
divided by hairlines. New settings (the builder harness picker, for example) are another `Section` there.

## Components to use

- **Text and headings:** `Text` (tone `muted`/`danger`, `bold`, `mono`), `Heading` only on standalone screens (first run).
  In panes, the `PaneHeader` title is the heading and `Section` titles are the subheadings.
- **Actions:** `Button`: `primary` once per group, `default` (outline), `quiet` (ghost) for toolbars and rows, `danger`.
  `size="sm"` in headers, rows and cards; `size="icon"` with an `Icon` and an `aria-label`. More than three actions,
  or rarely used ones: a `Menu`.
- **Status:** `Badge` (tones `default`, `info` working, `success` landed, `warning` needs you, `danger` failed) beside
  a title; `StatusDot` in lists. Thread states map through `app/threads/labels.ts` so every surface agrees.
- **Forms:** `Field` around every `TextField`, `TextArea` and `Select`. Chat input is always `Composer`.
- **Content:** `Card` for one thing (a started thread, a commit, a PR, an approval), `Message` for conversation turns
  (`you`, `agent`, `tool`, and `note` for something that happened, like a thread update), `Alert` for errors and
  warnings, `EmptyState` when a list or view can be empty.
- **Icons:** `Icon` (Lucide outlines at 16px). Add a path there rather than an SVG in a screen.

## Tokens

From `sevenyears/src/tokens.stylex.ts`: colors (`background`, `foreground`, `muted`, `mutedForeground`, `accent`,
`border`, `primary` #7c3aed, `success`, `warning`, `destructive`, `sidebar`), space on a 4px grid, radius `sm` 6 /
`md` 8 / `lg` 12, type `xs` 12 / `caption` 13 / `sm` 14 / `base` 16, motion `fast` 120ms and `glide` 220ms. Body text
in the app is 14px. Spacing: 8 between controls in a row, 12 to 16 between blocks, 24 around a pane's content.

## Checking a screen

`bun run tour` retakes the screenshots in `docs/ui-tour/` (headless, scripted harnesses). Every UI change ships with
a screenshot linked from its issue.
