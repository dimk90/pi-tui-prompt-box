# Architecture

How `pi-tui-prompt-box` hooks into Pi, and the rules that changes must
preserve. This file holds the overview, the lifecycle, the module boundaries,
state, and the required invariants. The look of the box is specified in
[ui.md](ui.md).

## Lifecycle

```text
session_start    → install PromptBoxEditor via setEditorComponent,
                   pad Pi's chat, queued messages, widgets, and dialogs,
                   wrap Pi's built-in footer in PaddedFooter via setFooter
session_shutdown → remove the container padding, except on quit
```

The editor factory passed to `setEditorComponent` runs when Pi builds the
editor, so the TUI reference is captured there, not in `session_start`.
Pi calls it synchronously, so `session_start` can use the reference right
after `setEditorComponent` returns.

Pi gives extensions no reference to its built-in footer, and `setFooter`
replaces it. So `session_start` finds the built-in footer in the TUI component
tree before calling `setFooter`, which removes it from the tree. The footer is
matched by its `setSession` and `setAutoCompactEnabled` methods, not with
`instanceof`. If it is not found, for example because another extension
already replaced it, the footer is left unchanged. Pi restores the built-in
footer on every extension reload, so each `session_start` finds it again.

Pi gives extensions no references to its chat, queued messages, and widget
containers either, and no API to replace them. `session_start` finds them by
the shape of the TUI tree, whose seven children are: document, queued
messages, status, widgets above, editor, widgets below, and footer. The
editor child must hold the `PromptBoxEditor`, and the document must hold three
containers: header, loaded resources, and chat. If the tree has another shape,
nothing is changed. The header, loaded resources, and status stay unpadded.

Pi shows its selectors (model, settings, login) and the extension dialogs
(`select`, `confirm`, `input`, and `custom` without `overlay`) in the editor
container, in place of the editor. So the editor container is padded too, but
only while it does not hold the `PromptBoxEditor`, which draws its own margins.
Overlays are drawn over the whole screen at the positions their extensions
choose, so they stay unchanged.

The containers can't be replaced in the tree: fullscreen mode builds its
layout from the container objects, not from the TUI children. So
`padComponent()` sets its own `render` and `handleMouse` on each container
instance, never on Pi's classes, and both modes use them. Pi keeps adding
children to the same objects, so nothing else changes. A container with its
own `render` is already padded and is not padded again. Pi keeps these
containers across extension reloads and session changes, so
`session_shutdown` deletes the own properties for the next extension
instance. On quit the padding stays, as Pi may still print the transcript.

In fullscreen mode with the `auto` scrollbar, Pi draws the scrollbar over the
last column of the chat, so the padded containers, the prompt box, and the
footer are also narrowed by one column on the right, and keep their right
edges aligned. In `always` mode Pi already narrows the chat itself; `hidden`
mode and regular mode have no scrollbar. Pi gives extensions no reference to
its scroll view, so `readScrollbarPadding()` reads the TUI's fullscreen layout
root (a field Pi's types mark private) and looks among its children for the
one that holds the document (the first TUI child) and has a `scrollbar` mode.
If it is not found, no column is added. It is called on every render and mouse
event, so the padding follows mode switches and changes of the scrollbar
setting.

The box status line already shows the model, so `PaddedFooter` removes the
model part that Pi right-aligns on the footer stats line (second line):
`(provider) model-id • level`. It builds that text from `ctx.model` and the
thinking level, as Pi does, and cuts it only when the stats line ends with it
after at least two spaces. Otherwise the line stays unchanged, for example
when Pi truncated it, shows a routed model, or changed its format. Custom
footers from other extensions are never wrapped; hiding their parts is their job.

## Module Boundaries

| Path                          | Responsibility                                                   |
| ----------------------------- | ---------------------------------------------------------------- |
| `src/index.ts`                | Wiring: factory and the `session_start` handler.                 |
| `src/ui/prompt-box-editor.ts` | `PromptBoxEditor`: box layout around the base editor output.     |
| `src/ui/status-line.ts`       | Status line text: model, provider, thinking level, bash mode.    |
| `src/ui/padded-containers.ts` | Pi's chat, queued messages, widgets, dialogs moved by margins.   |
| `src/ui/scrollbar-padding.ts` | Right padding for Pi's fullscreen `auto` scrollbar.              |
| `src/ui/padded-footer.ts`     | `PaddedFooter`: Pi's built-in footer moved, model part removed.  |
| `src/ui/colors.ts`            | ANSI codes of the box background; other colors use the theme.    |

## Editor Rendering

`PromptBoxEditor` extends `CustomEditor` and renders the base editor at the
inner text width. The base output is top border, text lines, bottom border,
and autocomplete lines. `renderBottomBorder()` returns a marker so `render()`
can find where the text lines end; both base borders are dropped. The top one
is replaced by an empty box row, the bottom one by a half-block row. The
autocomplete lines go below the box, moved left by Pi's 2-column item prefix so
the item text aligns with the input text. Styled content may reset all attributes, so every reset
inside a box row is followed by the box background again.

Pi's editor maps mouse events with its own layout, so `handleMouse()` maps
them back with the box geometry of the last render: text rows are moved left
by the text indent, autocomplete rows also up by the two extra box rows, and
the width is the inner text width. Box rows without text (top padding, blank,
status, half row) are passed on the base top border row, where Pi only takes
focus. When the last render fell back to the base editor, events pass unchanged.

The accent bar and the thinking level use the editor `borderColor`. Pi
copies it to the editor and updates it when the thinking level or bash mode
changes, so the box never computes it. Bash mode for the status line is
checked with Pi's rules: the input, without leading whitespace, starts with
`!`, or with `!!` when the output stays out of the context. The status line reads the other colors
from `ctx.ui.theme` at render time, so theme changes apply on the next render.

## Busy Indicator

The editor sets `embedWorkingStatus`, so Pi passes its status indicator
(working, retry, compaction, branch summary) to `setWorkingStatusIndicator()`
instead of drawing it above the editor. Pi owns the indicator: it creates,
animates, colors, and disposes it, and applies `setWorkingMessage`,
`setWorkingIndicator`, and `setWorkingVisible` from extensions. The editor only
keeps a reference and draws it after the status line text. The text is cut
first so the spinner fits; the rest of the indicator is cut to the remaining
width with `renderInBorder()`.

For a `working` indicator with Pi's default message (`Working`, or
`Working (<key> to interrupt)` after an extension reload), only the spinner is
drawn. Pi keeps the message private, so it is read from the rendered indicator
without the spinner. Custom messages and other indicator kinds are drawn in
full, as is an indicator without a spinner frame.

## State

No extension state; nothing is persisted. The editor keeps Pi's current status
indicator. The extension keeps the function that removes the container padding. Model and thinking level are read from the context at render time.

## Required Invariants

- Normal turns are unchanged: the extension adds nothing to provider requests.
- The extension starts no timers; busy indicator animation is Pi's.
- Widths below the box minimum fall back to the base editor rendering.
- The footer content stays Pi's: `PaddedFooter` only narrows and indents it
  and removes the exactly matched model part, and never disposes the built-in
  footer, which Pi owns.
- Custom footers set by other extensions are never changed.
- The content of padded containers stays Pi's: the padding only narrows and
  indents it, and passes mouse events in the container coordinates.
- Pi's classes are never changed; only the padded container instances are.
