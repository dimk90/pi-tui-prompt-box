# TODO

- [ ] Dynamic background brightening function for prompt box:
  - background[prompt-box] = brighten(theme.background)
- [ ] Fix `doc/ui.md`.
  - Terminal background is the user's, not always black.
- [ ] Add render tests for the editor.
  - Box background restored after every reset.
  - Every row has the full width.
  - Status line truncation.
  - Autocomplete lines placed below the box.
- [ ] Add mock provider:
  - Response with fake text & thinking to demonstrate on a fake session.
  - No real model calls, model response are fake.
  - Funny provider & model name.
  - No thinking mode.
- [ ] Add a demo GIF (S-VHS) and logo to the README:
  - demo: switch thinking effort;
  - demo: bash mode;
  - demo: spinner;
