# TODO

- [x] Add `early access` badge on GitHub.
  - Reserve name on npm.
  - Don't show it on pi.dev package list till it stable (no pi package tag in the manifest).
- [x] Adjust colors to use current pi theme.
  - Use the editor `borderColor` for the accent bar: Pi sets it from the thinking level.
- [x] Show thinking effort as lower case - no need to capitalize.
- [x] Add padding to the footer to align with the prompt box.
- [ ] Move Pi busy indicator inside the prompt box.
- [ ] Add padding to the model/tools output to align with the prompt box.
- [ ] Hide or move model&provider in the footer.
- [x] Decide about upper row of the box - should it be full-size?
- [ ] Adjust padding for autocompletion?
- [ ] Check the prompt box in Pi's regular TUI mode (`--tui-mode`); adjust it or disable it there.
- [ ] Restore the editor scroll indicators (`↑ N more` / `↓ N more`).
  - Pi draws them in the top and bottom borders, which the box drops.
  - Show them in the padding rows or in the status line.
- [x] Show bash mode (input starting with `!`).
  - Pi shows it with `borderColor`, which the box drops.
- [ ] Handle Pi's editor `paddingX` setting.
  - `setEditorComponent` copies it over our `paddingX: 0`, so text gets extra indent inside the box.
  - Ignore it or include it in the width math.
- [ ] Decide what the status line shows when thinking is off (now `· Off`).
- [x] Split `src/index.ts` as described in `doc/ARCHITECTURE.md`.
  - Status line and editor component in separate modules.
- [ ] Dynamic background brightening function for prompt box:
  - background[prompt-box] = brighten(theme.background)
- [ ] Add render tests for the editor.
  - Fallback to the base editor below the minimum width.
  - Box background restored after every reset.
  - Every row has the full width.
  - Status line truncation.
  - Autocomplete lines placed below the box.
- [ ] Add a lifecycle test: the spinner timer stops on `session_shutdown` without `agent_settled`.
- [ ] Fix `doc/ui.md`.
  - Terminal background is the user's, not always black.
- [ ] Add a demo GIF (S-VHS) and logo to the README:
  - demo: switch thinking effort;
  - demo: bash mode;
  - demo: spinner;
- [ ] Issue: exit from regular mode leave black gap in place of cursor.
  - See `doc/issue-1.png`.



# Backlog

- [ ] Show subscription quota inside the box (separate compatible extension).
- [ ] Keep prompt boxes for user messages/prompts.
  - Show it without padding to stand out of model/tools output.
  - Keep color to show effort for corresponding prompt.
- [ ] Custom autocompletion visualization: drop up menu instead of dropdown.
  - Probably need more advanced TUI API and components.
  - Separate extension of optional part of this one?
- [ ] Support light terminal themes (the fixed `#1e1e1e` box looks broken there).
- [ ] Handle other extensions that call `setEditorComponent`: only the last one wins.
  - Document it in the README or detect it.
- [ ] Configurable status line: choose which parts to show (e.g. hide the provider).
