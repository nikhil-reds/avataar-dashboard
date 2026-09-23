# Admin color rollout plan

## Goal and current status

Use only white, black, #0085FF, #0D0E12, #12141D, #2C2C2C,
#383838, #E0E0E0, and #A1A1A1 for authored admin interface colors.
All eight admin sections and their shared components are in scope.

The global palette and light/dark semantic tokens are added in app/globals.css.
Component migration is planned below; existing page colors have not yet been replaced.
Keep current layouts, account/session behavior, and data operations intact.

## Color mapping

| Purpose / utility | Dark mode | Light mode |
| --- | --- | --- |
| Page canvas: bg-admin-canvas | #0D0E12 | #E0E0E0 |
| Sidebar, header, cards: bg-admin-surface | #12141D | #FFFFFF |
| Raised controls: bg-admin-surface-raised | #2C2C2C | #FFFFFF |
| Hover: bg-admin-hover | #383838 | #E0E0E0 |
| Dividers: border-admin-border | #383838 | #A1A1A1 |
| Heading/body: text-admin-text | #FFFFFF | #0D0E12 |
| Secondary text: text-admin-text-secondary | #E0E0E0 | #2C2C2C |
| Muted text: text-admin-text-muted | #A1A1A1 | #383838 |
| Selected background: bg-admin-selected | #2C2C2C | #12141D |
| Selected text: text-admin-selected-text | #FFFFFF | #FFFFFF |
| Primary action, focus, chart accent | #0085FF | #0085FF |
| Text on blue buttons: text-admin-on-accent | #000000 | #000000 |

Do not add alternate blue shades for hover. Use an outline, underline, or an
/* progress step 1 */
focus rings, and key data. In light mode, ordinary links use dark text and an
underline, since small blue text on white has insufficient contrast.
Use opaque palette colors for ordinary surfaces. Transparency is limited to
black dialog backdrops and optional blue shadows, with no additional source hues.
Existing photographs, video, and official logo artwork retain their original colors.

## Implementation order

1. **Global foundation — added.** Define palette values once and expose semantic
   Tailwind utilities. Preserve the existing data-theme light/dark toggle.
2. **Shared shell.** Migrate AdminShell, Sidebar, Header, ThemeToggle, BackToList,
   breadcrumbs, navigation badges, scrollbars, and the account/logout footer.
   Scope scrollbar overrides to the admin shell. Cover hover, focus, selected,
   disabled, and mobile drawer states.
3. **Dashboard reference screen.** Migrate StatCard, ServiceHealth, and LatencyRoute.
   Use blue bars with neutral tracks. Replace red/green deltas with explicit
   increase/decrease wording and directional icons. Give every service a visible
   status label rather than relying on a colored dot.
4. **Tables and detail views.** Migrate Activity logs, Conversations, Catalogue,
   and Memory, including filters, search, pagination, transcripts, detail panels,
   selected rows, empty states, and deletion confirmations.
5. **Editing and processing flows.** Migrate PDF ingest, Manual entry,
   Avatar studio, and Persona. Cover inputs, previews, file upload, progress,
   render queues, validation messages, save feedback, and modal overlays.
6. **Final sweep and verification.** Remove remaining authored out-of-palette
   Tailwind classes and inline hex/RGB/OKLCH values from admin routes and all
   components they render. Inspect imported status/config maps as well as JSX.

## Status and interaction rules

- Success: check icon plus “Saved”, “Healthy”, or “Completed”.
- Warning: triangle icon plus “Needs attention” and an actionable explanation.
- Error: circle-X icon plus “Failed” or “Unavailable”, with a retry action when available.
- Pending: clock/spinner plus “Queued” or “Processing”.
- Status pills use neutral surfaces and readable text; blue may indicate active work.
- Destructive controls use a trash icon and explicit action text. Confirmation
  dialogs name the item and consequence; no red is needed to communicate the action.
- Form errors use text and icons, aria-invalid and aria-describedby. Keep alerts
  and live announcements where appropriate.
- Use visible blue focus outlines. Where a neutral divider is too subtle to
  identify an input, use the muted-text token for its border.
- Charts distinguish multiple series using labels, line styles, or patterns,
  together with blue and approved neutrals.

## Acceptance checks

- Review all nine routes in both themes at desktop and mobile widths.
- Check dialogs, drawers, tables, empty/error/loading states, and long account names.
- Confirm no old indigo, purple, red, green, amber, zinc, or slate color utilities
  remain in admin-owned UI; check gradients, shadows, SVG fills/strokes, and charts.
- Check text contrast (4.5:1 for ordinary text, 3:1 for large text) and interactive
  boundaries/focus contrast. Blue buttons use black text; avoid white small text on blue.
- Confirm keyboard focus, theme persistence, sidebar navigation, session identity,
  and logout still work. Do not trigger destructive operations merely to test styling.
- Run ESLint, TypeScript, and the production build; visually inspect the rendered
  output to catch missing generated classes or theme overrides.

## Completion definition

The rollout is complete when every admin route and interaction uses the semantic
tokens, statuses remain understandable without hue, and both themes pass the checks.