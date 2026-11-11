#!/usr/bin/env bash
#
# s-vhs recording of the accent bar color: cycle through every thinking level,
# then switch the input to bash mode with `!` and `!!`.
#
# Produces mode-colors.gif next to this script.
#

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/../.." && pwd)

# pi is started as `pi -e .`, so the recorded shell has to sit in the repo root
cd "$REPO_ROOT" || exit 1

# shellcheck disable=SC1090
source <(curl -fsSL https://dimk90.github.io/s-vhs/v0.7.0) && wait "$!" || exit 1


## Constants


# The demo provider never calls a real model, so every take is the same
PI_COMMAND='pi -e . -e ./demo/demo-provider.ts --model rubber-duck/quack-mini'
PI_COMMAND+=' --thinking off'
PI_COMMAND+=' --no-extensions --no-skills --no-prompt-templates --no-context-files'
PI_COMMAND+=' --no-session --offline'
PI_COMMAND+=' --use-theme dark'

# Thinking levels after `off`, in the order shift+tab cycles through them
THINKING_LEVELS=('minimal' 'low' 'medium' 'high' 'xhigh' 'max')

# Background of the `asciinema` theme
THEME_BACKGROUND='#121314'


## Configuration


Require 'pi'

# The recording lives next to the GIF it produces
SetOutput "$SCRIPT_DIR/demo.gif"

# Only the prompt box and the lines around it matter
SetCols 80
SetRows 11
SetFontSize 36
SetFontFamily 'Iosevka Term'
SetTheme 'asciinema'
SetTypingSpeed 0.1

# The GIF is committed to the repository, so shrink it losslessly
# SetOptimize 'on'

Start


## Recording


# TODO: remove for the new S-VHS version
# The box background is derived from the background the terminal reports;
# tmux reports black unless its window style names the theme background, and
# passes that color on unchanged only to a recorder that takes 24-bit color
Run "tmux set -w window-style 'bg=$THEME_BACKGROUND'"
Run "tmux set -as terminal-features ',*:RGB'"

# Bring pi up off camera, so the GIF opens on an idle TUI
Run "$PI_COMMAND"
Wait 'thinking off'

Show

Sleep 2

# Cycle the thinking levels; each one repaints the accent bar
for level in "${THINKING_LEVELS[@]}"; do
    Key 'BTab'
    Wait "· $level"
    Sleep 1
done

# Bash mode, then bash mode with the output kept out of the model context
Type '!'
Wait 'Bash'
Sleep 1
Type '!'
Wait 'Bash \(no context\)'
Sleep 2

# Clear the input: back to the thinking level color
Key 'C-u'
Wait '· max'
Sleep 1

Type 'Hi there'
Sleep 1
Enter
Sleep 4


Render
