/**
 * Main editor drawn as a filled box; the layout is specified in doc/ui.md.
 */

import { CustomEditor, type KeybindingsManager } from "@earendil-works/pi-coding-agent";
import { type EditorTheme, type TUI, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import { ACCENT_FG, BOX_BG, BOX_FG, RESET } from "./colors.ts";

const OUTER_MARGIN = 1;
const INNER_PADDING = 2;
const BAR_WIDTH = 1;

// Returned by renderBottomBorder() so render() can find where the text lines end
const BOTTOM_BORDER_MARKER = "\x00prompt-box-bottom-border\x00";

/**
 * Main editor drawn as a filled box with a left accent bar and a status line inside.
 *
 * The base editor renders the text lines; this class replaces its borders and
 * wraps every line in the box background. `renderStatus` is called on every
 * render, so the status line always shows the current state.
 */
export class PromptBoxEditor extends CustomEditor {
	private readonly renderStatus: () => string;

	constructor(tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager, renderStatus: () => string) {
		super(tui, theme, keybindings, { paddingX: 0 });
		this.renderStatus = renderStatus;
	}

	protected override renderBottomBorder(): string {
		return BOTTOM_BORDER_MARKER;
	}

	override render(width: number): string[] {
		const textWidth = width - 2 * OUTER_MARGIN - BAR_WIDTH - 2 * INNER_PADDING;
		if (textWidth < 1) return super.render(width);

		// Base layout: top border, text lines, bottom border, autocomplete lines
		const baseLines = super.render(textWidth);
		const bottomBorderIndex = baseLines.indexOf(BOTTOM_BORDER_MARKER);
		const textLines = baseLines.slice(1, bottomBorderIndex);
		const autocompleteLines = baseLines.slice(bottomBorderIndex + 1);

		const boxWidth = width - 2 * OUTER_MARGIN - BAR_WIDTH;
		return [
			renderHalfRow("╻", "▄", boxWidth),
			...textLines.map((line) => renderBoxRow(line, textWidth)),
			renderBoxRow("", textWidth),
			renderBoxRow(truncateToWidth(this.renderStatus(), textWidth, ""), textWidth),
			renderHalfRow("╹", "▀", boxWidth),
			...autocompleteLines.map((line) => " ".repeat(OUTER_MARGIN + BAR_WIDTH + INNER_PADDING) + line),
		];
	}
}

/**
 * Renders the thin top or bottom edge of the box with half blocks.
 */
function renderHalfRow(barChar: string, fillChar: string, boxWidth: number): string {
	const margin = " ".repeat(OUTER_MARGIN);
	return `${margin}${ACCENT_FG}${barChar}${BOX_FG}${fillChar.repeat(boxWidth)}${RESET}${margin}`;
}

/**
 * Renders one full-height box row: accent bar, padding and content on the box background.
 */
function renderBoxRow(content: string, textWidth: number): string {
	const margin = " ".repeat(OUTER_MARGIN);
	const padding = " ".repeat(INNER_PADDING);
	const fill = " ".repeat(Math.max(0, textWidth - visibleWidth(content)));
	// Styled content may reset all attributes, which would also drop the box background
	const boxedContent = content.replaceAll(RESET, RESET + BOX_BG);
	return `${margin}${ACCENT_FG}┃${RESET}${BOX_BG}${padding}${boxedContent}${fill}${padding}${RESET}${margin}`;
}
