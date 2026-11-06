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

import { PromptBoxEditor } from "../src/ui/prompt-box-editor.ts";

type StatusIndicator = NonNullable<Parameters<PromptBoxEditor["setWorkingStatusIndicator"]>[0]>;
type StatusIndicatorKind = StatusIndicator["kind"];

// Box columns around the text: left margin, accent bar and inner padding on both sides
const BOX_COLUMNS = 6;

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

test("PromptBoxEditor cuts the indicator message, then the text, but keeps the spinner", () => {
	const editor = createEditor();
	editor.setWorkingStatusIndicator(createIndicator("retry", "⠋", "Retrying"));

	assert.equal(renderStatusRow(editor, BOX_COLUMNS + 12), "model  ⠋ Ret");
	assert.equal(renderStatusRow(editor, BOX_COLUMNS + 6), "mod  ⠋");
});

test("PromptBoxEditor leaves the right padding after the box", () => {
	const editor = createEditor(() => 1);
	const lines = editor.render(40);

	for (const line of lines)
		assert.equal(visibleWidth(line), 40);
	assert.equal(renderStatusRow(editor, BOX_COLUMNS + 1 + 3), "mod");
	const halfRow = stripTerminalSequences(lines.at(-1) ?? "");
	assert.ok(halfRow.endsWith("▀ "), "one empty column after the box");
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
 * Creates the editor with stubs for the parts the render path does not use, and a fixed status text.
 */
function createEditor(readRightPadding?: () => number): PromptBoxEditor {
	const tui = { requestRender() {}, terminal: { rows: 40 } } as unknown as TUI;
	const theme = { borderColor: (text: string) => text, selectList: {} } as unknown as EditorTheme;

	return new PromptBoxEditor(tui, theme, {} as KeybindingsManager, () => "model", readRightPadding);
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
