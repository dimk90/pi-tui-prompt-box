# Architecture

How `pi-tui-prompt-box` hooks into Pi, and the rules that changes must
preserve. This file holds the overview, the lifecycle, the module boundaries,
state, and the required invariants. The look of the box is specified in
[ui.md](ui.md).

## Lifecycle

```text
session_start    → hide Pi's working indicator, install PromptBoxEditor via setEditorComponent,
                   wrap Pi's built-in footer in PaddedFooter via setFooter
agent_start      → start the spinner timer; each tick requests a render
agent_settled    → stop the spinner; agent_end is too early, Pi may still continue the run
session_shutdown → stop the spinner, drop the TUI reference; idempotent
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

## Module Boundaries

| Path                          | Responsibility                                                   |
| ----------------------------- | ---------------------------------------------------------------- |
| `src/index.ts`                | Wiring: factory, lifecycle handlers, spinner and closure state.  |
| `src/ui/prompt-box-editor.ts` | `PromptBoxEditor`: box layout around the base editor output.     |
| `src/ui/status-line.ts`       | Status line text: model, provider, thinking level, busy spinner. |
| `src/ui/padded-footer.ts`     | `PaddedFooter`: Pi's built-in footer moved by the box margins.   |
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

## State

Closure state only, nothing is persisted: whether the agent is working, the
spinner frame and timer, and the active TUI. Model and thinking level are read
from the context at render time.

## Required Invariants

- Normal turns are unchanged: the extension adds nothing to provider requests.
- The spinner timer never outlives the session.
- Widths below the box minimum fall back to the base editor rendering.
- The footer content stays Pi's: `PaddedFooter` only narrows and indents it,
  and never disposes the built-in footer, which Pi owns.
