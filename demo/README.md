# Demo provider

`demo-provider.ts` is a fake Pi provider for demo recordings and manual
testing. It never calls a real model, so it costs no tokens and gives the same
replies every time.

It adds the provider `Rubber Duck` with one reasoning model, `Quack Mini`.
Every thinking level is available, from `off` to `max`, so you can check the
prompt box colors for each of them.

## Usage

From the repository root:

```bash
pi -e . -e ./demo/demo-provider.ts --model rubber-duck/quack-mini
```

## Replies

Each reply quotes your prompt and adds a short markdown answer: a list and a
code block. Before the answer comes a thinking block. It is longer for higher
thinking levels, and there is none when thinking is `off`.

Words in the prompt change the reply:

| Word    | Reply                                                      |
| ------- | ---------------------------------------------------------- |
| `long`  | A long answer, to test scrolling.                          |
| `slow`  | Waits 5 seconds before streaming, to watch the busy state. |
| `error` | Ends with a provider error.                                |
