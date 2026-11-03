# Prompt box UI

```
                                                                            
 ┃░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
 ┃░░█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
 ┃░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
 ┃░░Big░Pickle░OpenCode░·░medium░░⠏░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
 ╹▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀ 
                                                                            
```

Legend:

- ` ` (space) — terminal background, black.
- `░` — input box background, dark gray (a bit brighter than the terminal background).
- `┃` — left accent bar, full height of the box, in the editor `borderColor`:
  the theme color of the thinking level, or the bash mode color.
- `█` — text cursor in the empty input line.
- Top padding row is a full empty box row.
- Bottom padding row is a half row, so the box looks thinner at the bottom edge.
  The upper half belongs to the box, the lower half is terminal background.
  - `▀` — upper half block, box background color on terminal background.
  - `╹` — upper half of the accent bar, same color as `┃`.
- The box has no other borders; only the background color separates it from the terminal.
- Blank line between the input and the status line.
- Status line:
  - `medium` — thinking level as Pi names it (lower case), same color as the accent bar.
  - `·` — separator, theme `dim`.
  - `Big Pickle` — model name, theme `text`.
  - `OpenCode` — provider, theme `dim`.
  - `⠏` — Pi's busy indicator, two spaces after the text: working,
    retry, compaction, or branch summary, with the message other extensions set.
    Pi's default working message (`Working`) is dropped, so a normal turn shows
    only the spinner; other messages stay.
    Pi colors it: working and compaction in the accent bar color, retry in `warning`.
    When the line is too narrow, the text is cut first, then the indicator
    message; the spinner stays.
- Bash mode (input starts with `!`): the accent bar uses Pi's bash mode color, and
  the status line shows `Bash` in that color instead of the model, provider, and mode.
  The busy indicator still follows it.
  - `!!` input (output kept out of the model context) shows `Bash (no context)`;
    `(no context)` is theme `dim`.

Footer: Pi's built-in footer, below the box, keeps its content but is moved
right by the box margins, so it starts in the same column as the accent bar.
The model part on the right of its stats line (`(provider) model • level`) is
removed, as the status line already shows it. A routed model (`→ …`) stays.
Custom footers from other extensions are left unchanged.

Colors: terminal `#0a0a0a`, box `#1e1e1e` (fixed, not from the theme).
All other colors come from the current Pi theme.
