# Architecture

How `pi-tui-prompt-box` hooks into Pi, and the rules that changes must
preserve. This file holds the overview, the lifecycle, the module boundaries,
state, and the required invariants. The look of the box is specified in
[ui.md](ui.md).

## Lifecycle

```text
session_start    → install PromptBoxEditor via setEditorComponent,
                   wrap Pi's chat container in PaddedChat,
                   wrap Pi's built-in footer in PaddedFooter via setFooter
session_shutdown → put Pi's chat container back, except on quit
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

Pi gives extensions no reference to its chat container either, and no API
to replace it. `session_start` finds it by the tree shape: the first TUI child
is Pi's document container with three containers (header, loaded resources,
chat), and the chat is the last one. `PaddedChat` replaces it there, in both
regular and fullscreen mode, as both render the document container. Pi keeps
its own reference and keeps adding messages to the chat, so nothing else
changes. If the tree has another shape, the chat is left unchanged.
`PaddedChat` has no `children`, so it is never wrapped twice. Pi keeps the
chat across extension reloads and session changes, so `session_shutdown` puts
it back for the next extension instance. On quit it stays, as Pi may still
print the transcript.

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
| `src/ui/padded-chat.ts`       | `PaddedChat`: Pi's chat container moved right by the margins.    |
| `src/ui/padded-footer.ts`     | `PaddedFooter`: Pi's built-in footer moved, model part removed.  |
| `src/ui/colors.ts`            | ANSI codes of the box background; other colors use the theme.    |

## Editor Rendering

`PromptBoxEditor` extends `CustomEditor` and renders the base editor at the
inner text width. The base output is top border, text lines, bottom border,
and autocomplete lines. `renderBottomBorder()` returns a marker so `render()`
can find where the text lines end; both base borders are dropped. The top one
is replaced by an empty box row, the bottom one by a half-block row. Styled content may reset all attributes, so every reset
inside a box row is followed by the box background again.

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
indicator. The extension keeps the function that puts the chat container back. Model and thinking level are read from the context at render time.

## Required Invariants

- Normal turns are unchanged: the extension adds nothing to provider requests.
- The extension starts no timers; busy indicator animation is Pi's.
- Widths below the box minimum fall back to the base editor rendering.
- The footer content stays Pi's: `PaddedFooter` only narrows and indents it
  and removes the exactly matched model part, and never disposes the built-in
  footer, which Pi owns.
- Custom footers set by other extensions are never changed.
- The chat content stays Pi's: `PaddedChat` only narrows and indents it, and
  passes mouse events in the chat coordinates.
