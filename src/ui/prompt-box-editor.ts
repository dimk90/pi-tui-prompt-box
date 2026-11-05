/**
 * Main editor drawn as a filled box; the layout is specified in doc/ui.md.
 */

import { CustomEditor, type KeybindingsManager } from "@earendil-works/pi-coding-agent";
import { type EditorTheme, stripTerminalSequences, type TUI, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import { BOX_BG, BOX_FG, RESET } from "./colors.ts";
import type { ReadRightPadding } from "./scrollbar-padding.ts";
import type { BashMode } from "./status-line.ts";

/** Terminal columns left empty on each side of the box; the footer uses them too. */
export const LEFT_MARGIN = 1;
export const RIGHT_MARGIN = 0;
const INNER_PADDING = 2;
const BAR_WIDTH = 1;
// Spaces between the status line text and Pi's busy indicator
const BUSY_GAP = 2;
// Pi's default working message, also with the interrupt hint Pi adds after an extension reload
const DEFAULT_WORKING_MESSAGE = /^Working( \(.+ to interrupt\))?$/;
// Wide enough for the default working message; Pi pads the rendered indicator to this width
const MESSAGE_CHECK_WIDTH = 200;

// Returned by renderBottomBorder() so render() can find where the text lines end
const BOTTOM_BORDER_MARKER = "\x00prompt-box-bottom-border\x00";

/**
 * Builds the status line on every render from the editor state Pi does not expose elsewhere.
 */
export type RenderStatus = (barColor: (text: string) => string, bashMode: BashMode) => string;

// Pi does not export the StatusIndicator type
type StatusIndicator = NonNullable<Parameters<CustomEditor["setWorkingStatusIndicator"]>[0]>;

/**
 * Main editor drawn as a filled box with a left accent bar and a status line inside.
 *
 * The base editor renders the text lines; this class replaces its borders and
 * wraps every line in the box background. `renderStatus` is called on every
 * render, so the status line always shows the current state. The accent bar
 * uses `borderColor`, which Pi sets from the thinking level and bash mode.
 * With `embedWorkingStatus`, Pi passes its busy indicators (working, retry,
 * compaction, branch summary) to the editor, which shows them in the status line.
 * `readRightPadding` is called on every render and adds columns to the right margin.
 */
export class PromptBoxEditor extends CustomEditor {
	private readonly renderStatus: RenderStatus;
	private readonly readRightPadding: ReadRightPadding;
	private statusIndicator: StatusIndicator | undefined;

	constructor(
		tui: TUI,
		theme: EditorTheme,
		keybindings: KeybindingsManager,
		renderStatus: RenderStatus,
		readRightPadding: ReadRightPadding = () => 0,
	) {
		super(tui, theme, keybindings, { paddingX: 0, embedWorkingStatus: true });
		this.renderStatus = renderStatus;
		this.readRightPadding = readRightPadding;
	}

	// The base class keeps the indicator private, so keep a copy for the status line
	override setWorkingStatusIndicator(indicator: StatusIndicator | undefined): void {
		super.setWorkingStatusIndicator(indicator);
		this.statusIndicator = indicator;
	}

	protected override renderBottomBorder(): string {
		return BOTTOM_BORDER_MARKER;
	}

	override render(width: number): string[] {
		const rightMargin = RIGHT_MARGIN + this.readRightPadding();
		const textWidth = width - LEFT_MARGIN - rightMargin - BAR_WIDTH - 2 * INNER_PADDING;
		if (textWidth < 1)
			return super.render(width);

		// Base layout: top border, text lines, bottom border, autocomplete lines
		const baseLines = super.render(textWidth);
		const bottomBorderIndex = baseLines.indexOf(BOTTOM_BORDER_MARKER);
		const textLines = baseLines.slice(1, bottomBorderIndex);
		const autocompleteLines = baseLines.slice(bottomBorderIndex + 1);

		const boxWidth = width - LEFT_MARGIN - rightMargin - BAR_WIDTH;
		const barColor = this.borderColor;
		const status = this.renderStatusLine(textWidth, barColor);

		return [
			renderBoxRow("", textWidth, rightMargin, barColor),
			...textLines.map((line) => renderBoxRow(line, textWidth, rightMargin, barColor)),
			renderBoxRow("", textWidth, rightMargin, barColor),
			renderBoxRow(status, textWidth, rightMargin, barColor),
			renderHalfRow("╹", "▀", boxWidth, rightMargin, barColor),
			...autocompleteLines.map((line) => " ".repeat(LEFT_MARGIN + BAR_WIDTH + INNER_PADDING) + line),
		];
	}

	/**
	 * Renders the status line text followed by Pi's busy indicator, if any, within `textWidth`.
	 * The text is cut first so the spinner always fits; the indicator message is cut as Pi does in its border.
	 * Pi's default working message is dropped, so a normal turn shows only the spinner.
	 */
	private renderStatusLine(textWidth: number, barColor: (text: string) => string): string {
		const text = this.renderStatus(barColor, detectBashMode(this.getText()));
		const indicator = this.statusIndicator;
		if (!indicator)
			return truncateToWidth(text, textWidth, "");

		const spinnerWidth = visibleWidth(indicator.renderSpinnerInBorder(textWidth));
		const fittedText = truncateToWidth(text, Math.max(0, textWidth - BUSY_GAP - spinnerWidth), "");
		const busyWidth = textWidth - visibleWidth(fittedText) - BUSY_GAP;
		if (busyWidth < 1)
			return fittedText;

		const busy = hasDefaultWorkingMessage(indicator)
			? indicator.renderSpinnerInBorder(busyWidth)
			: indicator.renderInBorder(busyWidth);

		return truncateToWidth(`${fittedText}${" ".repeat(BUSY_GAP)}${busy}`, textWidth, "");
	}
}

/**
 * Checks if the indicator shows Pi's default working message, which the box hides to show only the spinner.
 * Pi keeps the message private, so it is read from the rendered indicator.
 * An indicator without a spinner keeps its message, so it never disappears.
 */
function hasDefaultWorkingMessage(indicator: StatusIndicator): boolean {
	if (indicator.kind !== "working")
		return false;

	const spinner = stripTerminalSequences(indicator.renderSpinnerInBorder(MESSAGE_CHECK_WIDTH));
	if (!spinner)
		return false;

	const rendered = stripTerminalSequences(indicator.renderInBorder(MESSAGE_CHECK_WIDTH));
	const message = rendered.startsWith(`${spinner} `) ? rendered.slice(spinner.length + 1) : rendered;

	return DEFAULT_WORKING_MESSAGE.test(message);
}

/**
 * Detects bash mode with Pi's rules: `!` runs a command, `!!` also keeps its output out of the context.
 */
function detectBashMode(text: string): BashMode {
	const input = text.trimStart();
	if (input.startsWith("!!"))
		return "no-context";

	if (input.startsWith("!"))
		return "context";

	return "off";
}

/**
 * Renders the thin bottom edge of the box with half blocks.
 */
function renderHalfRow(
	barChar: string,
	fillChar: string,
	boxWidth: number,
	rightMarginWidth: number,
	barColor: (text: string) => string,
): string {
	const leftMargin = " ".repeat(LEFT_MARGIN);
	const rightMargin = " ".repeat(rightMarginWidth);

	return `${leftMargin}${barColor(barChar)}${BOX_FG}${fillChar.repeat(boxWidth)}${RESET}${rightMargin}`;
}

/**
 * Renders one full-height box row: accent bar, padding and content on the box background.
 */
function renderBoxRow(
	content: string,
	textWidth: number,
	rightMarginWidth: number,
	barColor: (text: string) => string,
): string {
	const leftMargin = " ".repeat(LEFT_MARGIN);
	const rightMargin = " ".repeat(rightMarginWidth);
	const padding = " ".repeat(INNER_PADDING);
	const fill = " ".repeat(Math.max(0, textWidth - visibleWidth(content)));
	// Styled content may reset all attributes, which would also drop the box background
	const boxedContent = content.replaceAll(RESET, RESET + BOX_BG);

	return `${leftMargin}${barColor("┃")}${RESET}${BOX_BG}${padding}${boxedContent}${fill}${padding}${RESET}${rightMargin}`;
}
