/**
 * Prompt box proof of concept: replaces Pi's main editor with the boxed style from doc/ui.md.
 *
 * Usage: pi -e ./prompt-box.ts
 */

import {
	CustomEditor,
	type ExtensionAPI,
	type ExtensionContext,
	type KeybindingsManager,
} from "@earendil-works/pi-coding-agent";
import { type EditorTheme, type TUI, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const RESET = "\x1b[0m";
const BOX_BG = "\x1b[48;2;30;30;30m"; // #1e1e1e
const BOX_FG = "\x1b[38;2;30;30;30m"; // #1e1e1e, for half blocks drawn on the terminal background
const ACCENT_FG = "\x1b[38;2;92;156;245m"; // #5c9cf5
const BRIGHT_FG = "\x1b[38;2;238;238;238m"; // #eeeeee
const DIM_FG = "\x1b[38;2;128;128;128m";

const OUTER_MARGIN = 1;
const INNER_PADDING = 2;
const BAR_WIDTH = 1;

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL_MS = 80;

// Returned by renderBottomBorder() so render() can find where the text lines end
const BOTTOM_BORDER_MARKER = "\x00prompt-box-bottom-border\x00";

/**
 * Registers the prompt box editor for every session.
 */
export default function promptBox(pi: ExtensionAPI): void {
	let isWorking = false;
	let spinnerIndex = 0;
	let spinnerTimer: ReturnType<typeof setInterval> | undefined;
	let activeTui: TUI | undefined;

	function stopSpinner(): void {
		clearInterval(spinnerTimer);
		spinnerTimer = undefined;
	}

	pi.on("agent_start", () => {
		isWorking = true;
		stopSpinner();
		spinnerTimer = setInterval(() => {
			spinnerIndex = (spinnerIndex + 1) % SPINNER_FRAMES.length;
			activeTui?.requestRender();
		}, SPINNER_INTERVAL_MS);
		activeTui?.requestRender();
	});

	pi.on("agent_settled", () => {
		isWorking = false;
		stopSpinner();
		activeTui?.requestRender();
	});

	pi.on("session_shutdown", () => {
		stopSpinner();
		activeTui = undefined;
	});

	pi.on("session_start", (_event, ctx) => {
		// The box shows its own busy indicator in the status line
		ctx.ui.setWorkingVisible(false);

		const renderStatus = () => {
			const spinnerFrame = isWorking ? SPINNER_FRAMES[spinnerIndex] : undefined;
			return formatStatus(ctx, pi.getThinkingLevel(), spinnerFrame);
		};
		ctx.ui.setEditorComponent((tui, theme, keybindings) => {
			activeTui = tui;
			return new PromptBoxEditor(tui, theme, keybindings, renderStatus);
		});
	});
}

/**
 * Builds the status line: model, provider, thinking level and an optional busy indicator.
 */
function formatStatus(ctx: ExtensionContext, thinkingLevel: string, spinnerFrame: string | undefined): string {
	const model = ctx.model;
	const modelText = model ? `${BRIGHT_FG}${model.name} ${DIM_FG}${model.provider}` : `${DIM_FG}no model`;
	const separator = `${DIM_FG} · `;
	const mode = `${ACCENT_FG}${capitalize(thinkingLevel)}`;
	const busy = spinnerFrame ? `${DIM_FG}  ${spinnerFrame} Working` : "";
	return `${modelText}${separator}${mode}${busy}`;
}

/**
 * Upper-cases the first letter, e.g. "medium" -> "Medium".
 */
function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Main editor drawn as a filled box with a left accent bar and a status line inside.
 *
 * The base editor renders the text lines; this class replaces its borders and
 * wraps every line in the box background.
 */
class PromptBoxEditor extends CustomEditor {
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
