# pi-tui-prompt-box

<p align="center">
  <img width="456" src="doc/images/pi-tui-prompt-box.png">
  <br>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT"></a>
  <a href="https://pi.dev/packages/pi-tui-prompt-box"><img src="https://img.shields.io/badge/Pi-Package-6366F1?style=flat-square" alt="Pi Package"></a>
  <a href="https://www.npmjs.com/package/pi-tui-prompt-box"><img src="https://img.shields.io/npm/v/pi-tui-prompt-box?style=flat-square&amp;logoColor=white" alt="npm version"></a>
</p>

<br>

An alternative style for the prompt input in [Pi](https://pi.dev).

> TBD: update extension description in project.json
> TBD: add pi extension tag for pi.dev visibility

## Demo

### Mode Switching + Bash

TBD

### Spinner + Text Typing (text color)

TBD

## Install

```bash
pi install npm:pi-tui-prompt-box
```

## Side Effects

- Moves the chat, widgets, dialogs, and footer right so they line up with the
  prompt box. Their content and styling stay unchanged.

- Removes the model, provider, and thinking level from the default footer, as the
  prompt box already shows them. Custom footers stay unchanged.

- Moves Pi's busy indicator (spinner and message) into the prompt box. Custom
  spinner widgets stay unchanged.

- Replaces Pi's editor, so it does not work together with other extensions that
  replace the editor.

## Context Footprint

None. The extension only changes the terminal UI: it adds no tools, prompt
sections, or messages to the model context.

## My Other Stuff

📌 [S-VHS](https://github.com/dimk90/s-vhs) - a terminal recorder used to create the demo GIFs.

📌 [pi-context-view](https://github.com/dimk90/pi-context-view) - an extension to visualize context usage and inspect its hidden parts.

## License

[MIT](https://github.com/dimk90/pi-tui-prompt-box/blob/master/LICENSE)
