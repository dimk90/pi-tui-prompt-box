#!/usr/bin/env bash
#
# s-vhs recording of user messages drawn as prompt boxes: three prompts sent
# off camera with different thinking levels, then the chat is scrolled up to
# show the accent bar color of each one.
#
# Produces user-messages.gif next to this script.
#

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/../.." && pwd)

# pi is started as `pi -e .`, so the recorded shell has to sit in the repo root
cd "$REPO_ROOT" || exit 1

# shellcheck disable=SC1090
source <(curl -fsSL https://dimk90.github.io/s-vhs/v0.7.1) && wait "$!" || exit 1


## Constants


# The demo provider never calls a real model, so every take is the same
PI_COMMAND='pi -e . -e ./demo/demo-provider.ts --model rubber-duck/quack-mini'
PI_COMMAND+=' --thinking off'
PI_COMMAND+=' --no-extensions --no-skills --no-prompt-templates --no-context-files'
PI_COMMAND+=' --no-session --offline'
PI_COMMAND+=' --use-theme dark'

# Pi's one-line transcript scroll has no default key, so F11 is bound to it
KEYBINDINGS='{ "tui.altScreen.lineUp": "f11" }'

# Seconds between two one-line scroll steps
SCROLL_STEP_DELAY=0.04


## Helpers


# Sends prompt $1 and waits for the reply, which quotes it
send_prompt() {
    local prompt=$1

    Type "$prompt" 0
    Enter
    Wait "You said: $prompt" 30
    Wait 'That usually fixes it' 30
}


## Configuration


Require 'pi'

# A throwaway agent directory keeps the user's settings out of the recording
# and holds the scroll keybinding
AGENT_DIR=$(mktemp -d) || exit 1
Finally 'rm -rf "$AGENT_DIR"'
printf '%s\n' "$KEYBINDINGS" > "$AGENT_DIR/keybindings.json"
Env 'PI_CODING_AGENT_DIR' "$AGENT_DIR"

# The recording lives next to the GIF it produces
SetOutput "$SCRIPT_DIR/user-messages.gif"

SetCols 80
SetRows 18
SetFontSize 28
SetFontFamily 'Iosevka Term'
SetTheme 'asciinema'

# The GIF is committed to the repository, so shrink it losslessly
SetOptimize 'on'

Start


## Recording


# Bring pi up off camera and send one prompt per thinking level; shift+tab
# cycles off, minimal, low, medium, high, xhigh, max, so each switch is 4 presses
Run "$PI_COMMAND"
Wait 'thinking off'
send_prompt 'No need to think, just do it'

Key 'BTab' 6
Wait '· max'
send_prompt 'Go full blast on this one'

Key 'BTab' 4
Wait '· medium'
send_prompt 'Put some thought into this problem'


# The prompt box gets a level none of the sent prompts had
Key 'BTab' 1
Wait '· high'

Show

Sleep 1.5

# Scroll up to each prompt, from the last one to the first one, then to the
# start of the chat; the line counts fit an 18-row terminal
Key 'F11' 16 "$SCROLL_STEP_DELAY"   # medium
Sleep 2
Key 'F11' 30 "$SCROLL_STEP_DELAY"   # max
Sleep 2
Key 'F11' 16 "$SCROLL_STEP_DELAY"   # off
Sleep 2


Render
