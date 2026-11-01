# Prompt box UI

```
                                                                            
 ╻▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄  
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
- Top and bottom padding rows are half rows, so the box looks thinner at the edges.
  - Top row: the lower half belongs to the box, the upper half is terminal background.
    - `▄` — lower half block, box background color on terminal background.
    - `╻` — lower half of the accent bar, blue.
  - Bottom row: the upper half belongs to the box, the lower half is terminal background.
    - `▀` — upper half block, box background color on terminal background.
    - `╹` — upper half of the accent bar, blue.
- Note: in `ui-ref.png` the top padding row is a full row; we use a half row
  for symmetry.
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
