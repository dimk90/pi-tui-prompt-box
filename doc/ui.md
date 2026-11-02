# Prompt box UI

```
                                                                            
 ┃░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
 ┃░░█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
 ┃░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
 ┃░░Big░Pickle░OpenCode░·░medium░░⠏ Working░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
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
  - `⠏ Working` -- busy indicator (pi agent), theme `dim`.
- Bash mode (input starts with `!`): the accent bar uses Pi's bash mode color, and
  the status line shows `Bash` in that color instead of the model, provider, and mode.
  The busy indicator still follows it.
  - `!!` input (output kept out of the model context) shows `Bash (no context)`;
    `(no context)` is theme `dim`.

Colors: terminal `#0a0a0a`, box `#1e1e1e` (fixed, not from the theme).
All other colors come from the current Pi theme.
