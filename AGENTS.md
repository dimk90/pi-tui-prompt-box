# pi-tui-prompt-box

TypeScript pi extension (`src/index.ts`) that replaces Pi's main prompt editor with a filled box: a left accent bar, the input lines, and a status line with the model, provider, thinking level, and busy indicator. It has no commands and adds nothing to the model context.

The box is drawn only in TUI mode; other modes have no editor and are unaffected.

## Sources of truth

| Path                  | Read before                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `doc/ui.md`           | Changing how the box looks: layout, characters, and colors.                                        |
| `doc/PLAN.md`         | Picking up new work; it holds the TODO list and backlog.                                           |
| `doc/ARCHITECTURE.md` | Changing lifecycle handlers, state, or the editor component.                                       |
| `doc/RELEASE.md`      | Changing versions, tagging, publishing, or preparing a release; `scripts/release.sh` automates it. |

## Repository rules

- **Architecture contract.** Preserve the invariants in `doc/ARCHITECTURE.md`; update it with any lifecycle or state change.
- **UI contract.** Keep `doc/ui.md` in sync with the rendered box.
- **Module boundaries.** Keep `src/index.ts` to wiring: register handlers and hold closure state. Put independently testable logic in focused modules under `src/`, and TUI components in `src/ui/`.
- **Changelog entries.** Keep the text of each `CHANGELOG.md` bullet, after its `[scope]` tag, to about 80 characters.
- **Dependency contract.** Declare only the Pi packages (`pi-coding-agent`, `pi-tui`, `pi-ai`, `pi-agent-core`) the code imports, each as a `"*"` peer dependency with an exact development pin matching `pi --version`; run `pnpm install` after changing any pin.

## Verification

```bash
pnpm check
```

- **Shared test process.** `pnpm test` (`test/run.ts`) runs every test file concurrently in one process: no top-level hooks, no observable process-wide state changes, and no mocks that change a shared static method's behavior. Use `test/harness/settings.ts` for Pi settings.
- **Runtime tests.** Use `test/harness/runtime.ts`: the pinned Pi runs in process against the mock provider in `test/harness/mock-provider.ts`. Never call a real model unless explicitly requested.
- **Context footprint.** `test/runtime.test.ts` proves a normal turn sends the same provider request with and without the extension; keep it passing.
- **TUI changes.** Run real-PTY UI checks only when explicitly requested; follow the `pi-extension` skill.
