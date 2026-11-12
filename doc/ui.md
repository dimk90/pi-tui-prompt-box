# UI

What the user sees: the prompt box and how the other parts of Pi are moved
around it. How the code achieves it is in [ARCHITECTURE.md](ARCHITECTURE.md).

## Prompt box

```
                                                                            
 ┃░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
 ┃░░█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
 ┃░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
 ┃░░Big░Pickle░OpenCode░Zen░·░medium░░⠏░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
 ╹▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀ 
                                                                            
```

Legend:

- ` ` (space) — terminal background, the user's terminal color.
- `░` — input box background, a bit lighter than the terminal background (darker on light terminals).
- `┃` — left accent bar, full height of the box, in the theme color of the
  thinking level, or the bash mode color.
- `█` — text cursor in the empty input line.
- Top padding row is a full empty box row.
- Bottom padding row is a half row, so the box looks thinner at the bottom edge.
  The upper half belongs to the box, the lower half is terminal background.
  - `▀` — upper half block, box background color on terminal background.
  - `╹` — upper half of the accent bar, same color as `┃`.
- The box has no other borders; only the background color separates it from the terminal.
- Blank line between the input and the status line.
- Scroll indicators: when the input has more lines than the box shows,
  `N ↑` goes in the top padding row and `N ↓` in the blank line, where `N` is
  the number of hidden lines above or below. They are right-aligned with one
  column left before the right edge of the box, so they extend into the inner
  padding, in theme `borderMuted`. Pi's word `more` is dropped.

## Status line

From left to right, after the inner padding:

- `Big Pickle` — model name, theme `text`.
- `OpenCode Zen` — provider name as Pi shows it
  (`opencode` → `OpenCode Zen`), theme `dim`.
- `·` — separator, theme `dim`.
- `medium` — thinking level as Pi names it (lower case), same color as the accent bar.
  Level `off` shows as `thinking off`. Like Pi's footer, models without
  reasoning support show no level and no separator.
- `  →  GPT-5.6 Luna OpenAI · medium` — routed model, only under a virtual model
  (a router): the model that gave the latest successful response, in the same
  format as the selected model. Pi's footer shows it the same way, with the
  model id. Two spaces go on each side of the `→`. The name is theme `text`;
  the `→`, provider, and separator are theme `dim`. The level has the theme
  color of its own level, the one the accent bar would have for it, so two
  colors show that the levels differ. The level is hidden when the response has none or the routed model has no
  reasoning support. Before the first response, nothing is added.
- `⠏` — Pi's busy indicator, two spaces after the text: working,
  retry, compaction, or branch summary, with the message other extensions set.
  Pi's default working message (`Working`) is dropped, so a normal turn shows
  only the spinner; other messages stay.
  Pi colors it: working and compaction in the accent bar color, retry in `warning`.
  When the line is too narrow, the text is cut first, then the indicator
  message; the spinner stays.

## Bash mode

- Input starts with `!`: the accent bar uses Pi's bash mode color, and
  the status line shows `Bash` in that color instead of the model, provider, and mode.
  The busy indicator still follows it.
- `!!` input (output kept out of the model context) shows `Bash (no context)`;
  `(no context)` is theme `dim`.

## Editor padding

Pi's editor `paddingX` setting (`/settings`): adds that many columns to both
margins of the box, so the box gets narrower. The padding inside the box stays
the same, and the autocomplete list moves with the box. The chat, footer, and
dialogs keep their margins, so they align with the box only when the setting is 0.

## Autocomplete list

Slash commands and file paths: below the box, outside its
background. It is moved left by the width of Pi's item prefix (`→ ` or two
spaces), so the item text starts in the same column as the input text, and the
`→` of the selected item sits in the inner padding. Its rows are padded with
spaces to the full width, like the box rows.

## Other parts of Pi

Footer: Pi's built-in footer, below the box, keeps its content but is moved
right by the box margins, so it starts in the same column as the accent bar.
The model part on the right of its stats line (`(provider) model • level`,
with `→ model • level` after it for a routed model) is removed, as the status
line already shows it.
Custom footers from other extensions are left unchanged.

Chat, queued messages, and extension widgets: moved right by the box margins,
so colored blocks (user messages, tool output) start in the same column as the
accent bar. Pi's `outputPad` setting still adds its padding inside them. The
header and the loaded resources above the chat stay unchanged.

Selectors and extension dialogs shown in place of the box (for example `/model`
or a permission prompt): moved right by the box margins like the chat.
Overlays stay where their extensions place them.

Fullscreen mode with the `auto` scrollbar: the chat, queued messages, widgets,
dialogs, prompt box, and footer leave the last terminal column empty, so the scrollbar
does not cover the chat and all right edges stay aligned.

## Colors

The box background has the hue of the terminal background and is slightly
lighter on dark terminals, slightly darker on light ones. It follows the
terminal when it switches between light and dark. All other colors come from
the current Pi theme.
