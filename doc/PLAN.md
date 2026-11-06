# TODO

- [ ] Decide what the status line shows when thinking is off (now `· Off`).
- [ ] Dynamic background brightening function for prompt box:
  - background[prompt-box] = brighten(theme.background)
- [ ] Add render tests for the editor.
  - Fallback to the base editor below the minimum width.
  - Box background restored after every reset.
  - Every row has the full width.
  - Status line truncation.
  - Autocomplete lines placed below the box.
- [ ] Fix the fallback to the base editor below the minimum box width.
  - `render()` calls `super.render(width)`, which still uses our `renderTopBorder()` and
    `renderBottomBorder()` overrides.
  - So the fallback output starts with an empty line instead of Pi's top border, and has
    `BOTTOM_BORDER_MARKER` (`\x00prompt-box-bottom-border\x00`) as a line instead of the bottom border.
  - The marker goes to the terminal as is.
  - Pi's editor `paddingX` makes the fallback start at wider widths: `2 * paddingX` more columns.
  - Fix: let the border overrides return Pi's borders while the fallback renders, or rebuild
    the borders in the fallback.
- [ ] Fix `doc/ui.md`.
  - Terminal background is the user's, not always black.
- [ ] Add mock provider:
  - Response with fake text & thinking to demonstrate on a fake session.
  - No real model calls, model response are fake.
  - Funny provider & model name.
  - No thinking mode.
- [ ] Add a demo GIF (S-VHS) and logo to the README:
  - demo: switch thinking effort;
  - demo: bash mode;
  - demo: spinner;
