# Architecture

How `pi-tui-prompt-box` hooks into Pi, and the rules that changes must
preserve. This file holds the overview, the lifecycle, the module boundaries,
state, and the required invariants. The look of the box is specified in
[ui.md](ui.md).

## Lifecycle

```text
session_start    → hide Pi's working indicator, install PromptBoxEditor via setEditorComponent
agent_start      → start the spinner timer; each tick requests a render
agent_settled    → stop the spinner; agent_end is too early, Pi may still continue the run
session_shutdown → stop the spinner, drop the TUI reference; idempotent
```

The editor factory passed to `setEditorComponent` runs when Pi builds the
editor, so the TUI reference is captured there, not in `session_start`.

## Module Boundaries

| Path           | Responsibility                                                                     |
| -------------- | ---------------------------------------------------------------------------------- |
| `src/index.ts` | Proof of concept: factory, handlers, spinner state, status line, editor component. |

Target split, following the project rules: `src/index.ts` keeps the factory and
closure state, the status line moves and the editor component moves to its own module.

## Editor Rendering

`PromptBoxEditor` extends `CustomEditor` and renders the base editor at the
inner text width. The base output is top border, text lines, bottom border,
and autocomplete lines. `renderBottomBorder()` returns a marker so `render()`
can find where the text lines end; both base borders are dropped and replaced
by half-block rows. Styled content may reset all attributes, so every reset
inside a box row is followed by the box background again.

## State

Closure state only, nothing is persisted: whether the agent is working, the
spinner frame and timer, and the active TUI. Model and thinking level are read
from the context at render time.

## Required Invariants

- Normal turns are unchanged: the extension adds nothing to provider requests.
- The spinner timer never outlives the session.
- Widths below the box minimum fall back to the base editor rendering.
