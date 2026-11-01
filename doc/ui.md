# Prompt box UI

```
                                                                            
 ┃░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  
 ┃░░█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  
 ┃░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  
 ┃░░Big░Pickle░OpenCode░·░Medium░░⠏ Working░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  
 ╹▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀  
                                                                            
```

Legend:

- ` ` (space) — terminal background, black.
- `░` — input box background, dark gray (a bit brighter than the terminal background).
- `┃` — left accent bar, blue, full height of the box.
- `█` — text cursor in the empty input line.
- Top padding row is a full empty box row.
- Bottom padding row is a half row, so the box looks thinner at the bottom edge.
  The upper half belongs to the box, the lower half is terminal background.
  - `▀` — upper half block, box background color on terminal background.
  - `╹` — upper half of the accent bar, blue.
- The box has no other borders; only the background color separates it from the terminal.
- Blank line between the input and the status line.
- Status line:
  - `Medium` — mode, blue.
  - `·` — separator, dim.
  - `Big Pickle` — model name, bright/white.
  - `OpenCode` — provider, dim gray.
  - `⠏ Working` -- busy indicator (pi agent)

Colors: terminal `#0a0a0a`, box `#1e1e1e`, bar and `Medium` `#5c9cf5`,
cursor and model name `#eeeeee`.
