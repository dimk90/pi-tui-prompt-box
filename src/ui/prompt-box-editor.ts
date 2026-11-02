/**
 * Main editor drawn as a filled box; the layout is specified in doc/ui.md.
 */

import { CustomEditor, type KeybindingsManager } from "@earendil-works/pi-coding-agent";
import { type EditorTheme, type TUI, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import { BOX_BG, BOX_FG, RESET } from "./colors.ts";
import type { BashMode } from "./status-line.ts";

const LEFT_MARGIN = 1;
const RIGHT_MARGIN = 0;
const INNER_PADDING = 2;
const BAR_WIDTH = 1;

// Returned by renderBottomBorder() so render() can find where the text lines end
const BOTTOM_BORDER_MARKER = "\x00prompt-box-bottom-border\x00";

/**
 * Builds the status line on every render from the editor state Pi does not expose elsewhere.
 */
export type RenderStatus = (barColor: (text: string) => string, bashMode: BashMode) => string;

/**
 * Main editor drawn as a filled box with a left accent bar and a status line inside.
 *
 * The base editor renders the text lines; this class replaces its borders and
 * wraps every line in the box background. `renderStatus` is called on every
 * render, so the status line always shows the current state. The accent bar
 * uses `borderColor`, which Pi sets from the thinking level and bash mode.
 */
export class PromptBoxEditor extends CustomEditor {
	private readonly renderStatus: RenderStatus;

	constructor(tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager, renderStatus: RenderStatus) {
		super(tui, theme, keybindings, { paddingX: 0 });
		this.renderStatus = renderStatus;
	}

	protected override renderBottomBorder(): string {
		return BOTTOM_BORDER_MARKER;
	}

	override render(width: number): string[] {
		const textWidth = width - LEFT_MARGIN - RIGHT_MARGIN - BAR_WIDTH - 2 * INNER_PADDING;
		if (textWidth < 1) return super.render(width);

		// Base layout: top border, text lines, bottom border, autocomplete lines
		const baseLines = super.render(textWidth);
		const bottomBorderIndex = baseLines.indexOf(BOTTOM_BORDER_MARKER);
		const textLines = baseLines.slice(1, bottomBorderIndex);
		const autocompleteLines = baseLines.slice(bottomBorderIndex + 1);

		const boxWidth = width - LEFT_MARGIN - RIGHT_MARGIN - BAR_WIDTH;
		const barColor = this.borderColor;
		const status = truncateToWidth(this.renderStatus(barColor, detectBashMode(this.getText())), textWidth, "");
		return [
			renderBoxRow("", textWidth, barColor),
			...textLines.map((line) => renderBoxRow(line, textWidth, barColor)),
			renderBoxRow("", textWidth, barColor),
			renderBoxRow(status, textWidth, barColor),
			renderHalfRow("╹", "▀", boxWidth, barColor),
			...autocompleteLines.map((line) => " ".repeat(LEFT_MARGIN + BAR_WIDTH + INNER_PADDING) + line),
		];
	}
}

/**
 * Detects bash mode with Pi's rules: `!` runs a command, `!!` also keeps its output out of the context.
 */
function detectBashMode(text: string): BashMode {
	const input = text.trimStart();
	if (input.startsWith("!!")) return "no-context";
	if (input.startsWith("!")) return "context";
	return "off";
}

/**
 * Renders the thin bottom edge of the box with half blocks.
 */
function renderHalfRow(
	barChar: string,
	fillChar: string,
	boxWidth: number,
	barColor: (text: string) => string,
): string {
	const leftMargin = " ".repeat(LEFT_MARGIN);
	const rightMargin = " ".repeat(RIGHT_MARGIN);
	return `${leftMargin}${barColor(barChar)}${BOX_FG}${fillChar.repeat(boxWidth)}${RESET}${rightMargin}`;
}

/**
 * Renders one full-height box row: accent bar, padding and content on the box background.
 */
function renderBoxRow(content: string, textWidth: number, barColor: (text: string) => string): string {
	const leftMargin = " ".repeat(LEFT_MARGIN);
	const rightMargin = " ".repeat(RIGHT_MARGIN);
	const padding = " ".repeat(INNER_PADDING);
	const fill = " ".repeat(Math.max(0, textWidth - visibleWidth(content)));
	// Styled content may reset all attributes, which would also drop the box background
	const boxedContent = content.replaceAll(RESET, RESET + BOX_BG);
	return `${leftMargin}${barColor("┃")}${RESET}${BOX_BG}${padding}${boxedContent}${fill}${padding}${RESET}${rightMargin}`;
}
