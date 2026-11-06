/**
 * Main editor drawn as a filled box; the layout is specified in doc/ui.md.
 */

import { CustomEditor, type KeybindingsManager } from "@earendil-works/pi-coding-agent";
import {
	type EditorTheme,
	stripTerminalSequences,
	truncateToWidth,
	type TUI,
	type TuiMouseEvent,
	type TuiMouseEventResult,
	visibleWidth,
} from "@earendil-works/pi-tui";

import { BOX_BG, BOX_FG, RESET } from "./colors.ts";
import type { ReadRightPadding } from "./scrollbar-padding.ts";
import type { BashMode } from "./status-line.ts";

/**
 * Terminal columns left empty on each side of the box; the chat and the footer use them too.
 * Pi's editor `paddingX` setting adds to them only for the box.
 */
export const LEFT_MARGIN = 1;
export const RIGHT_MARGIN = 0;
const INNER_PADDING = 2;
const BAR_WIDTH = 1;
// Pi's select list starts every item with a 2-column prefix (`→ ` or spaces); the list is moved left by it,
// so the item text starts in the same column as the input text
const SELECT_PREFIX_WIDTH = 2;
// Columns between the left margin and the input text
const TEXT_OFFSET = BAR_WIDTH + INNER_PADDING;
// Box rows between the text lines and the autocomplete lines (blank, status, half row), where the base
// editor has only its bottom border
const ROWS_AFTER_TEXT = 3;
const BASE_ROWS_AFTER_TEXT = 1;
// Base editor row of its top border; mouse events on box rows without text are passed on this row
const BASE_BORDER_ROW = 0;
// Spaces between the status line text and Pi's busy indicator
const BUSY_GAP = 2;
// Pi's default working message, also with the interrupt hint Pi adds after an extension reload
const DEFAULT_WORKING_MESSAGE = /^Working( \(.+ to interrupt\))?$/;
// Wide enough for the default working message; Pi pads the rendered indicator to this width
const MESSAGE_CHECK_WIDTH = 200;

// Scroll indicator arrows, as Pi shows them in its borders
const SCROLL_UP = "↑";
const SCROLL_DOWN = "↓";
// Columns between a scroll indicator and the right edge of the box; it extends into the inner padding
const SCROLL_INDICATOR_GAP = 1;

// Returned by renderBottomBorder() so render() can find where the text lines end
const BOTTOM_BORDER_MARKER = "\x00prompt-box-bottom-border\x00";

/**
 * Builds the status line on every render from the editor state Pi does not expose elsewhere.
 */
export type RenderStatus = (barColor: (text: string) => string, bashMode: BashMode) => string;

// Pi does not export the StatusIndicator type
type StatusIndicator = NonNullable<Parameters<CustomEditor["setWorkingStatusIndicator"]>[0]>;

/**
 * Box geometry of the last render, used to map mouse events to the base editor layout.
 */
interface BoxLayout {
	leftMargin: number;
	textWidth: number;
	textLineCount: number;
}

/**
 * Terminal columns left empty on each side of the box.
 */
interface BoxMargins {
	left: number;
	right: number;
}

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
 * Pi's editor `paddingX` setting adds columns to both margins of the box and moves the autocomplete list
 * with it; the text padding inside the box stays the same.
 * Pi's scroll indicators (`N ↑`, `N ↓`) go right-aligned into the padding rows
 * around the text, in the theme `borderColor` (Pi's `borderMuted`).
 */
export class PromptBoxEditor extends CustomEditor {
	private readonly renderStatus: RenderStatus;
	// The base class keeps the theme private; its borderColor stays Pi's `borderMuted` while Pi changes the
	// editor borderColor for the thinking level and bash mode
	private readonly editorTheme: EditorTheme;
	private readonly readRightPadding: ReadRightPadding;
	private statusIndicator: StatusIndicator | undefined;
	// Pi's editor paddingX setting; the base editor keeps 0, so its text indent inside the box stays the same
	private boxPaddingX = 0;
	// Text lines hidden above and below the visible ones, set by the base render through the border methods
	private hiddenAbove = 0;
	private hiddenBelow = 0;
	// Undefined when the last render fell back to the base editor layout
	private boxLayout: BoxLayout | undefined;
	// Set while the base editor renders its own layout below the box minimum width, so it keeps Pi's borders
	private renderingFallback = false;

	constructor(
		tui: TUI,
		theme: EditorTheme,
		keybindings: KeybindingsManager,
		renderStatus: RenderStatus,
		readRightPadding: ReadRightPadding = () => 0,
	) {
		super(tui, theme, keybindings, { paddingX: 0, embedWorkingStatus: true });
		this.renderStatus = renderStatus;
		this.editorTheme = theme;
		this.readRightPadding = readRightPadding;
	}

	// The base class keeps the indicator private, so keep a copy for the status line
	override setWorkingStatusIndicator(indicator: StatusIndicator | undefined): void {
		super.setWorkingStatusIndicator(indicator);
		this.statusIndicator = indicator;
	}

	// Pi copies its editor paddingX setting here; it widens the box margins instead of the base text indent
	override getPaddingX(): number {
		return this.boxPaddingX;
	}

	override setPaddingX(padding: number): void {
		const boxPaddingX = Number.isFinite(padding) ? Math.max(0, Math.floor(padding)) : 0;
		if (this.boxPaddingX === boxPaddingX)
			return;

		this.boxPaddingX = boxPaddingX;
		this.tui.requestRender();
	}

	// In the box layout the base top border is dropped; only its hidden line count is kept
	protected override renderTopBorder(width: number, hiddenLineCount: number): string {
		if (this.renderingFallback)
			return super.renderTopBorder(width, hiddenLineCount);

		this.hiddenAbove = hiddenLineCount;
		return "";
	}

	protected override renderBottomBorder(width: number, hiddenLineCount: number): string {
		if (this.renderingFallback)
			return super.renderBottomBorder(width, hiddenLineCount);

		this.hiddenBelow = hiddenLineCount;
		return BOTTOM_BORDER_MARKER;
	}

	override render(width: number): string[] {
		const margins = {
			left: LEFT_MARGIN + this.boxPaddingX,
			right: RIGHT_MARGIN + this.boxPaddingX + this.readRightPadding(),
		};
		const textWidth = width - margins.left - margins.right - BAR_WIDTH - 2 * INNER_PADDING;
		if (textWidth < 1) {
			this.boxLayout = undefined;
			return this.renderFallback(width);
		}

		// Base layout: top border, text lines, bottom border, autocomplete lines
		const baseLines = super.render(textWidth);
		const bottomBorderIndex = baseLines.indexOf(BOTTOM_BORDER_MARKER);
		const textLines = baseLines.slice(1, bottomBorderIndex);
		const autocompleteLines = baseLines.slice(bottomBorderIndex + 1);
		this.boxLayout = { leftMargin: margins.left, textWidth, textLineCount: textLines.length };

		const boxWidth = width - margins.left - margins.right - BAR_WIDTH;
		const barColor = this.borderColor;
		const status = this.renderStatusLine(textWidth, barColor);

		const scrollUp = this.renderScrollIndicator(SCROLL_UP, this.hiddenAbove, textWidth);
		const scrollDown = this.renderScrollIndicator(SCROLL_DOWN, this.hiddenBelow, textWidth);

		const autocompleteIndent = " ".repeat(margins.left + TEXT_OFFSET - SELECT_PREFIX_WIDTH);

		return [
			renderBoxRow(scrollUp, textWidth, margins, barColor),
			...textLines.map((line) => renderBoxRow(line, textWidth, margins, barColor)),
			renderBoxRow(scrollDown, textWidth, margins, barColor),
			renderBoxRow(status, textWidth, margins, barColor),
			renderHalfRow("╹", "▀", boxWidth, margins, barColor),
			...autocompleteLines.map((line) => padToWidth(autocompleteIndent + line, width)),
		];
	}

	/**
	 * Passes the mouse event to the base editor in its own layout, so clicks place the cursor under the pointer
	 * and select autocomplete items. Box rows without text (top padding, blank, status, half row) are passed on
	 * the base top border row, so the box takes focus there as on Pi's borders.
	 */
	override handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
		const layout = this.boxLayout;
		if (!layout)
			return super.handleMouse(event);

		const autocompleteRow = 1 + layout.textLineCount + ROWS_AFTER_TEXT;
		const rowShift = ROWS_AFTER_TEXT - BASE_ROWS_AFTER_TEXT;
		const baseEvent = { ...event, width: layout.textWidth, height: event.height - rowShift };
		const textIndent = layout.leftMargin + TEXT_OFFSET;
		if (event.y >= autocompleteRow) {
			const x = event.x - textIndent + SELECT_PREFIX_WIDTH;
			return super.handleMouse({ ...baseEvent, x, y: event.y - rowShift });
		}

		const y = event.y <= layout.textLineCount ? event.y : BASE_BORDER_ROW;

		return super.handleMouse({ ...baseEvent, x: event.x - textIndent, y });
	}

	/**
	 * Renders the base editor layout with Pi's borders, for widths below the box minimum.
	 */
	private renderFallback(width: number): string[] {
		this.renderingFallback = true;
		try {
			return super.render(width);
		} finally {
			this.renderingFallback = false;
		}
	}

	/**
	 * Renders Pi's scroll indicator (`N ↑`) right-aligned `SCROLL_INDICATOR_GAP` columns before the box edge, so
	 * it extends into the inner padding, or an empty row content when no lines are hidden. The label is cut from
	 * the right when the box is too narrow.
	 */
	private renderScrollIndicator(direction: string, hiddenLineCount: number, textWidth: number): string {
		if (hiddenLineCount < 1)
			return "";

		const indicatorWidth = textWidth + INNER_PADDING - SCROLL_INDICATOR_GAP;
		const label = truncateToWidth(`${hiddenLineCount} ${direction}`, indicatorWidth, "");

		return " ".repeat(indicatorWidth - visibleWidth(label)) + this.editorTheme.borderColor(label);
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
 * Pads `line` with trailing spaces to `width` columns, so rows outside the box have the full width too.
 */
function padToWidth(line: string, width: number): string {
	return line + " ".repeat(Math.max(0, width - visibleWidth(line)));
}

/**
 * Renders the thin bottom edge of the box with half blocks.
 */
function renderHalfRow(
	barChar: string,
	fillChar: string,
	boxWidth: number,
	margins: BoxMargins,
	barColor: (text: string) => string,
): string {
	const leftMargin = " ".repeat(margins.left);
	const rightMargin = " ".repeat(margins.right);

	return `${leftMargin}${barColor(barChar)}${BOX_FG}${fillChar.repeat(boxWidth)}${RESET}${rightMargin}`;
}

/**
 * Renders one full-height box row: accent bar, padding and content on the box background.
 * Content wider than `textWidth` extends into the right inner padding; only scroll indicators do that.
 */
function renderBoxRow(
	content: string,
	textWidth: number,
	margins: BoxMargins,
	barColor: (text: string) => string,
): string {
	const leftMargin = " ".repeat(margins.left);
	const rightMargin = " ".repeat(margins.right);
	const padding = " ".repeat(INNER_PADDING);
	const fill = " ".repeat(Math.max(0, textWidth + INNER_PADDING - visibleWidth(content)));
	// Styled content may reset all attributes, which would also drop the box background
	const boxedContent = content.replaceAll(RESET, RESET + BOX_BG);

	return `${leftMargin}${barColor("┃")}${RESET}${BOX_BG}${padding}${boxedContent}${fill}${RESET}${rightMargin}`;
}
