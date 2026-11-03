import assert from "node:assert/strict";
import { test } from "node:test";

import type { KeybindingsManager } from "@earendil-works/pi-coding-agent";
import { type EditorTheme, stripTerminalSequences, truncateToWidth, type TUI } from "@earendil-works/pi-tui";

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

/**
 * Creates the editor with stubs for the parts the render path does not use, and a fixed status text.
 */
function createEditor(): PromptBoxEditor {
	const tui = { requestRender() {}, terminal: { rows: 40 } } as unknown as TUI;
	const theme = { borderColor: (text: string) => text, selectList: {} } as unknown as EditorTheme;

	return new PromptBoxEditor(tui, theme, {} as KeybindingsManager, () => "model");
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
 * Renders the editor and returns the status row text without the box and trailing spaces.
 */
function renderStatusRow(editor: PromptBoxEditor, width: number): string {
	const lines = editor.render(width);
	// Box rows: top padding, text lines, blank row, status row, half row
	const statusRow = lines[lines.length - 2] ?? "";

	return stripTerminalSequences(statusRow).slice(BOX_COLUMNS - 2).trim();
}
