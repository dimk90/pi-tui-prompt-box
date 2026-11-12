import assert from "node:assert/strict";
import { test } from "node:test";

import type { KeybindingsManager } from "@earendil-works/pi-coding-agent";
import {
	type EditorTheme,
	type SelectItem,
	SelectList,
	stripTerminalSequences,
	truncateToWidth,
	type TUI,
	type TuiMouseEvent,
	visibleWidth,
} from "@earendil-works/pi-tui";

import { RESET } from "../src/ui/colors.ts";
import { PromptBoxEditor } from "../src/ui/prompt-box-editor.ts";

type StatusIndicator = NonNullable<Parameters<PromptBoxEditor["setWorkingStatusIndicator"]>[0]>;
type StatusIndicatorKind = StatusIndicator["kind"];

// Box columns around the text: left margin, accent bar and inner padding on both sides
const BOX_COLUMNS = 6;
const BOX_COLORS = { background: "\x1b[48;2;31;31;31m", halfBlock: "\x1b[38;2;31;31;31m" };

test("PromptBoxEditor shows Pi's busy indicator after the status line text", () => {
	const editor = createEditor();
	assert.equal(renderStatusRow(editor, 40), "model");

	editor.setWorkingStatusIndicator(createIndicator("retry", "⠋", "Retrying"));
	assert.equal(renderStatusRow(editor, 40), "model  ⠋ Retrying");

	editor.setWorkingStatusIndicator(undefined);
	assert.equal(renderStatusRow(editor, 40), "model");
});

test("PromptBoxEditor shows only the spinner for Pi's default working message", () => {
	const editor = createEditor();
	for (const message of ["Working", "Working (escape to interrupt)"]) {
		editor.setWorkingStatusIndicator(createIndicator("working", "⠋", message));
		assert.equal(renderStatusRow(editor, 60), "model  ⠋");
	}

	editor.setWorkingStatusIndicator(createIndicator("working", "⠋", "Reading files"));
	assert.equal(renderStatusRow(editor, 60), "model  ⠋ Reading files");

	editor.setWorkingStatusIndicator(createIndicator("working", "", "Working"));
	assert.equal(renderStatusRow(editor, 60), "model  Working");
});

test("PromptBoxEditor gives Pi the busy color for its indicator and keeps the bar color Pi set", () => {
	let busyColor: ((text: string) => string) | undefined;
	const editor = createEditor({ readBusyColor: () => busyColor });
	editor.borderColor = (text) => `<bar>${text}</>`;

	// Pi colors its working indicator with the editor borderColor it reads on every frame
	const indicator = createIndicator("working", "⠋", "Working");
	indicator.renderSpinnerInBorder = () => editor.borderColor("⠋");
	indicator.renderInBorder = () => `${editor.borderColor("⠋")} Working`;
	editor.setWorkingStatusIndicator(indicator);

	/** Renders the accent bar and the status row content, with the test color tags kept. */
	const renderBarAndStatus = () => {
		const row = stripTerminalSequences(editor.render(40).at(-2) ?? "").trim();
		return row.replace(/ {2,}/g, " ");
	};

	assert.equal(renderBarAndStatus(), "<bar>┃</> model <bar>⠋</>", "no routed level");

	busyColor = (text) => `<routed>${text}</>`;
	assert.equal(renderBarAndStatus(), "<bar>┃</> model <routed>⠋</>");

	editor.setText("!ls");
	assert.equal(renderBarAndStatus(), "<bar>┃</> model <bar>⠋</>", "bash mode");
});

test("PromptBoxEditor cuts the indicator message, then the text, but keeps the spinner", () => {
	const editor = createEditor();
	editor.setWorkingStatusIndicator(createIndicator("retry", "⠋", "Retrying"));

	assert.equal(renderStatusRow(editor, BOX_COLUMNS + 12), "model  ⠋ Ret");
	assert.equal(renderStatusRow(editor, BOX_COLUMNS + 6), "mod  ⠋");
});

test("PromptBoxEditor leaves the right padding after the box", () => {
	const editor = createEditor({ readRightPadding: () => 1 });
	const lines = editor.render(40);

	for (const line of lines)
		assert.equal(visibleWidth(line), 40);
	assert.equal(renderStatusRow(editor, BOX_COLUMNS + 1 + 3), "mod");
	const halfRow = stripTerminalSequences(lines.at(-1) ?? "");
	assert.ok(halfRow.endsWith("▀ "), "one empty column after the box");
});

test("PromptBoxEditor adds Pi's editor paddingX to the box margins, not to the text padding", () => {
	const editor = createEditor();
	editor.setPaddingX(2);
	editor.setText("/mo");
	openAutocomplete(editor, [{ value: "model", label: "model" }]);

	const lines = editor.render(40).map((line) => stripTerminalSequences(line));
	for (const line of lines)
		assert.equal(visibleWidth(line), 40);
	assert.equal(editor.getPaddingX(), 2);
	assert.ok(lines[0]?.startsWith("   ┃"), "bar after the left margin and paddingX");
	assert.ok(lines.at(-2)?.endsWith("▀  "), "paddingX after the box");

	const inputColumn = (lines[1] ?? "").indexOf("/mo");
	assert.equal(inputColumn, 6);
	assert.equal((lines.at(-3) ?? "").indexOf("model"), inputColumn, "status line text");
	assert.equal((lines.at(-1) ?? "").indexOf("→ model") + 2, inputColumn, "autocomplete item text");
});

test("PromptBoxEditor maps clicks with Pi's editor paddingX", () => {
	const editor = createEditor();
	editor.setPaddingX(3);
	editor.setText("hello");
	const lines = editor.render(40).map((line) => stripTerminalSequences(line));

	const column = (lines[1] ?? "").indexOf("hello") + 2;
	editor.handleMouse(createClick(column, 1, lines.length));
	assert.deepEqual(editor.getCursor(), { line: 0, col: 2 });
});

test("PromptBoxEditor falls back to the base editor when Pi's editor paddingX leaves no text width", () => {
	const editor = createEditor();
	editor.setPaddingX(2);

	const lines = editor.render(BOX_COLUMNS + 4).map((line) => stripTerminalSequences(line));
	assert.ok(lines.every((line) => !line.includes("┃")), "no box");
});

test("PromptBoxEditor keeps Pi's borders in the fallback and draws the box again when wide enough", () => {
	const editor = createEditor();
	editor.setText("hi");

	const border = "─".repeat(BOX_COLUMNS);
	const lines = editor.render(BOX_COLUMNS).map((line) => stripTerminalSequences(line));
	assert.equal(lines[0], border, "Pi's top border");
	assert.equal(lines.at(-1), border, "Pi's bottom border");
	for (const line of lines)
		assert.equal(visibleWidth(line), BOX_COLUMNS);

	const boxLines = editor.render(BOX_COLUMNS + 1).map((line) => stripTerminalSequences(line));
	assert.ok(boxLines.every((line) => !line.includes("─")), "no Pi borders in the box");
	assert.equal(boxLines[1]?.trim(), "┃  h");
});

test("PromptBoxEditor shows Pi's scroll indicators right-aligned in the padding rows", () => {
	const editor = createEditor();
	const lines = Array.from({ length: 30 }, (_, index) => `line ${index}`);
	editor.setText(lines.join("\n"));
	editor.render(40);
	// The terminal stub has 40 rows, so the editor shows 12 lines; the cursor on line 10 shows lines 10 to 21
	const state = Reflect.get(editor, "state") as { cursorLine: number };
	state.cursorLine = 10;

	const rows = editor.render(40).map((line) => stripTerminalSequences(line));
	const blankRow = rows.length - 3;
	assert.ok(rows[0]?.endsWith("10 ↑ "), "↑ in the top padding row, 1 column before the box edge");
	assert.ok(rows[blankRow]?.endsWith("8 ↓ "), "↓ in the blank row above the status line");

	editor.setText("short");
	const shortRows = editor.render(40).map((line) => stripTerminalSequences(line));
	assert.equal(shortRows[0]?.trim(), "┃");
	assert.equal(shortRows[shortRows.length - 3]?.trim(), "┃");
});

test("PromptBoxEditor aligns the autocomplete item text with the input text", () => {
	const editor = createEditor();
	editor.setText("/mo");
	openAutocomplete(editor, [{ value: "model", label: "model" }]);

	const lines = editor.render(40).map((line) => stripTerminalSequences(line));
	const inputColumn = (lines[1] ?? "").indexOf("/mo");
	const autocompleteRow = lines.at(-1) ?? "";
	assert.equal(autocompleteRow.indexOf("→ model") + 2, inputColumn);
	assert.equal(visibleWidth(autocompleteRow), 40, "full width");
});

test("PromptBoxEditor places the autocomplete lines below the box, outside its background", () => {
	const editor = createEditor();
	editor.setText("/mo");
	openAutocomplete(editor, [
		{ value: "model", label: "model" },
		{ value: "move", label: "move" },
	]);

	const lines = editor.render(40);
	const halfRow = lines.findIndex((line) => line.includes("▀"));
	assert.equal(halfRow, 4, "top padding, input, blank, status, half row");

	const autocompleteRows = lines.slice(halfRow + 1);
	assert.deepEqual(autocompleteRows.map((row) => stripTerminalSequences(row).trim()), ["→ model", "move"]);
	for (const row of autocompleteRows)
		assert.ok(!row.includes(BOX_COLORS.background), "no box background");
});

test("PromptBoxEditor renders every row at the full width", () => {
	const editor = createEditor({ status: "Big Pickle OpenCode Zen · medium", readRightPadding: () => 1 });
	editor.setWorkingStatusIndicator(createIndicator("retry", "⠋", "Retrying"));
	editor.setText(`/mo ${"word ".repeat(20)}\n${Array.from({ length: 30 }, (_, index) => `line ${index}`).join("\n")}`);
	const state = Reflect.get(editor, "state") as { cursorLine: number };
	state.cursorLine = 10;
	openAutocomplete(editor, [
		{ value: "model", label: "model" },
		{ value: "move", label: "move" },
	]);

	for (const paddingX of [0, 2]) {
		editor.setPaddingX(paddingX);
		// Narrowest box: margins with paddingX and the right padding column, and one text column
		const minWidth = BOX_COLUMNS + 2 * paddingX + 1 + 1;
		for (let width = minWidth; width <= 80; width++) {
			const lines = editor.render(width);
			assert.ok(lines[0]?.includes("┃"), `box drawn at paddingX ${paddingX}, width ${width}`);
			for (const line of lines)
				assert.equal(visibleWidth(line), width, `paddingX ${paddingX}, width ${width}`);
		}
	}
});

test("PromptBoxEditor cuts a long status line text at the text width, keeping the inner padding", () => {
	const editor = createEditor({ status: "Big Pickle OpenCode Zen · medium" });

	const statusRow = editor.render(BOX_COLUMNS + 10).at(-2) ?? "";
	assert.equal(stripTerminalSequences(statusRow), " ┃  Big Pickle  ");
});

test("PromptBoxEditor restores the box background after every reset inside a box row", () => {
	const bold = (text: string) => `\x1b[1m${text}${RESET}`;
	const editor = createEditor({ status: `${bold("model")} provider`, borderColor: bold });
	editor.setText(Array.from({ length: 30 }, (_, index) => `line ${index}`).join("\n"));
	editor.render(40);
	// Both scroll indicators show, so the padding rows have styled content too
	const state = Reflect.get(editor, "state") as { cursorLine: number };
	state.cursorLine = 10;

	const lines = editor.render(40);
	const boxRows = lines.slice(0, -1);
	let contentResets = 0;
	for (const row of boxRows) {
		// The bar before the box has its own color and reset; after it, the parts are the box content between
		// resets, then the right margin
		const box = row.slice(row.indexOf(BOX_COLORS.background));
		const parts = box.split(RESET);
		for (const part of parts.slice(0, -1))
			assert.ok(part.startsWith(BOX_COLORS.background), `background after a reset in ${JSON.stringify(row)}`);
		assert.equal(parts.at(-1)?.trim(), "", "only the right margin after the box");

		contentResets += parts.length - 2;
	}
	assert.equal(contentResets, 3, "resets of the status text and both scroll indicators");

	const halfRow = lines.at(-1) ?? "";
	assert.ok(halfRow.includes(`${BOX_COLORS.halfBlock}▀`), "half blocks in the box color");
});

test("PromptBoxEditor places the cursor where the input text is clicked", () => {
	const editor = createEditor();
	editor.setText("hello\nworld");
	const lines = editor.render(40).map((line) => stripTerminalSequences(line));

	const row = lines.findIndex((line) => line.includes("world"));
	const column = (lines[row] ?? "").indexOf("world") + 3;
	assert.deepEqual(editor.handleMouse(createClick(column, row, lines.length)), { handled: true, focus: true });
	assert.deepEqual(editor.getCursor(), { line: 1, col: 3 });

	const statusRow = lines.length - 2;
	assert.deepEqual(editor.handleMouse(createClick(column, statusRow, lines.length)), { handled: true, focus: true });
	assert.deepEqual(editor.getCursor(), { line: 1, col: 3 }, "clicks on the status line keep the cursor");
});

test("PromptBoxEditor selects the clicked autocomplete item", () => {
	const editor = createEditor();
	editor.setText("/mo");
	const items = [
		{ value: "model", label: "model" },
		{ value: "move", label: "move" },
	];
	const list = openAutocomplete(editor, items);
	let selected: string | undefined;
	list.onSelect = (item) => {
		selected = item.value;
	};
	const lines = editor.render(40).map((line) => stripTerminalSequences(line));

	const row = lines.findIndex((line) => line.includes("move"));
	const column = (lines[row] ?? "").indexOf("move");
	editor.handleMouse(createClick(column, row, lines.length));
	assert.equal(selected, "move");
});

/**
 * Options of a test editor:
 *   status             fixed status line text, `model` by default
 *   borderColor        theme `borderColor` for the scroll indicators, plain by default
 *   readRightPadding   columns added to the right margin, 0 by default
 *   readBusyColor      busy indicator color, the accent bar color by default
 */
interface TestEditorOptions {
	status?: string;
	borderColor?: (text: string) => string;
	readRightPadding?: () => number;
	readBusyColor?: () => ((text: string) => string) | undefined;
}

/**
 * Creates the editor with stubs for the parts the render path does not use, and a fixed status text.
 */
function createEditor(options: TestEditorOptions = {}): PromptBoxEditor {
	const { status = "model", borderColor = (text: string) => text, readRightPadding, readBusyColor } = options;
	const tui = { requestRender() {}, terminal: { rows: 40 } } as unknown as TUI;
	const theme = { borderColor, selectList: {} } as unknown as EditorTheme;

	const readBoxColors = () => BOX_COLORS;

	return new PromptBoxEditor(tui, theme, {} as KeybindingsManager,
		() => status,
		readBoxColors,
		readRightPadding,
		readBusyColor,
	);
}

/**
 * Creates a fixed busy indicator that renders like Pi's: spinner, space, message cut to the width.
 */
function createIndicator(kind: StatusIndicatorKind, spinner: string, message: string): StatusIndicator {
	const indicator = {
		kind,
		renderInBorder: (width: number) => truncateToWidth(spinner ? `${spinner} ${message}` : message, width, ""),
		renderSpinnerInBorder: (width: number) => truncateToWidth(spinner, width, ""),
	};

	return indicator as unknown as StatusIndicator;
}

/**
 * Opens the autocomplete list with `items` as its trigger would; the base editor keeps the state private.
 */
function openAutocomplete(editor: PromptBoxEditor, items: SelectItem[]): SelectList {
	const plain = (text: string) => text;
	const theme = { selectedPrefix: plain, selectedText: plain, description: plain, scrollInfo: plain, noMatch: plain };
	const list = new SelectList(items, 5, theme);
	Reflect.set(editor, "autocompleteList", list);
	Reflect.set(editor, "autocompleteState", "regular");

	return list;
}

/**
 * Creates a left click event at `x`, `y` of the editor rendered at width 40 with `height` lines.
 */
function createClick(x: number, y: number, height: number): TuiMouseEvent {
	return {
		type: "click",
		button: "left",
		x,
		y,
		screenX: x,
		screenY: y,
		width: 40,
		height,
		shift: false,
		alt: false,
		ctrl: false,
	};
}

/**
 * Renders the editor and returns the status row text without the box and trailing spaces.
 */
function renderStatusRow(editor: PromptBoxEditor, width: number): string {
	const lines = editor.render(width);
	// Box rows: top padding, text lines, blank row, status row, half row
	const statusRow = lines[lines.length - 2] ?? "";

	return stripTerminalSequences(statusRow).slice(BOX_COLUMNS - 2).trim();
}
