import assert from "node:assert/strict";
import { test } from "node:test";

import { type Component, Container, ScrollView, type TuiMouseEvent } from "@earendil-works/pi-tui";

import { padComponent, padPiContainers } from "../src/ui/padded-containers.ts";
import { LEFT_MARGIN, RIGHT_MARGIN } from "../src/ui/prompt-box-editor.ts";

const INDENT = " ".repeat(LEFT_MARGIN);

test("padPiContainers pads the chat, queued messages, and widgets, but not the header", () => {
	const tree = createTree();

	const restore = padPiContainers(tree.root, tree.editor);
	assert.ok(restore);
	assert.equal(padPiContainers(tree.root, tree.editor), undefined, "padded containers are not padded again");
	for (const container of [tree.chat, tree.queuedMessages, tree.widgetsAbove, tree.widgetsBelow])
		assert.deepEqual(container.render(80), [`${INDENT}line`]);
	for (const container of [tree.header, tree.status, tree.footer])
		assert.deepEqual(container.render(80), ["line"]);

	restore();
	assert.deepEqual(tree.chat.render(80), ["line"]);
	assert.equal(Object.hasOwn(tree.chat, "render"), false);
});

test("padPiContainers leaves a column for the fullscreen scrollbar in auto mode only", () => {
	const tree = createTree();
	const scrollView = new ScrollView(tree.document, { scrollbar: "auto" });
	const layoutRoot = new Container();
	layoutRoot.addChild(scrollView);
	Object.assign(tree.root, { layoutRoot });
	const widths: number[] = [];
	for (const container of [tree.chat, tree.widgetsAbove, tree.header])
		container.addChild(createWidthRecorder(widths));
	padPiContainers(tree.root, tree.editor);
	const innerWidth = 80 - LEFT_MARGIN - RIGHT_MARGIN;

	for (const container of [tree.chat, tree.widgetsAbove, tree.header])
		container.render(80);
	assert.deepEqual(widths.splice(0), [innerWidth - 1, innerWidth - 1, 80], "auto");

	for (const scrollbar of ["always", "hidden"] as const) {
		scrollView.setScrollbar(scrollbar);
		tree.chat.render(80);
		assert.deepEqual(widths.splice(0), [innerWidth], scrollbar);
	}
});

test("padPiContainers leaves other tree shapes unchanged", () => {
	const tree = createTree();
	assert.equal(padPiContainers(tree.root, createLine()), undefined, "editor not found");

	tree.root.addChild(new Container());
	assert.equal(padPiContainers(tree.root, tree.editor), undefined, "extra root child");
	assert.deepEqual(tree.chat.render(80), ["line"]);
});

test("padComponent narrows the component by the margins and indents every line", () => {
	const widths: number[] = [];
	const component: Component = {
		render(width) {
			widths.push(width);
			return ["first", "second"];
		},
		invalidate() {},
	};
	padComponent(component);

	assert.deepEqual(component.render(80), [`${INDENT}first`, `${INDENT}second`]);
	assert.deepEqual(widths, [80 - LEFT_MARGIN - RIGHT_MARGIN]);
});

test("padComponent passes mouse events in component coordinates and ignores the margins", () => {
	const events: TuiMouseEvent[] = [];
	const component: Component = {
		render: () => [],
		handleMouse(event) {
			events.push(event);
			return { handled: true };
		},
		invalidate() {},
	};
	padComponent(component);
	const innerWidth = 80 - LEFT_MARGIN - RIGHT_MARGIN;

	assert.deepEqual(component.handleMouse?.(createMouseEvent(LEFT_MARGIN + 5, 80)), { handled: true });
	assert.equal(events[0]?.x, 5);
	assert.equal(events[0]?.width, innerWidth);

	if (LEFT_MARGIN > 0) assert.equal(component.handleMouse?.(createMouseEvent(LEFT_MARGIN - 1, 80)), undefined);
	assert.equal(component.handleMouse?.(createMouseEvent(LEFT_MARGIN + innerWidth, 80)), undefined);
	assert.equal(events.length, 1);
});

/** Containers of a TUI tree with the same shape as Pi's; each holds one `line`, except the editor's. */
interface Tree {
	root: Container;
	document: Container;
	editor: Component;
	header: Container;
	chat: Container;
	queuedMessages: Container;
	status: Container;
	widgetsAbove: Container;
	widgetsBelow: Container;
	footer: Container;
}

/**
 * Builds a tree like Pi's: document (header, loaded resources, chat), queued messages, status, widgets above,
 * editor, widgets below, footer.
 */
function createTree(): Tree {
	const header = createLineContainer();
	const chat = createLineContainer();
	const queuedMessages = createLineContainer();
	const status = createLineContainer();
	const widgetsAbove = createLineContainer();
	const widgetsBelow = createLineContainer();
	const footer = createLineContainer();
	const document = new Container();
	document.addChild(header);
	document.addChild(new Container());
	document.addChild(chat);
	const editor = createLine();
	const editorContainer = new Container();
	editorContainer.addChild(editor);

	const root = new Container();
	for (const child of [document, queuedMessages, status, widgetsAbove, editorContainer, widgetsBelow, footer])
		root.addChild(child);
	return { root, document, editor, header, chat, queuedMessages, status, widgetsAbove, widgetsBelow, footer };
}

/** Container with one `line` child. */
function createLineContainer(): Container {
	const container = new Container();
	container.addChild(createLine());
	return container;
}

/** Component that renders one `line`. */
function createLine(): Component {
	return { render: () => ["line"], invalidate() {} };
}

/** Component that renders nothing and adds every width it is rendered at to `widths`. */
function createWidthRecorder(widths: number[]): Component {
	return {
		render(width) {
			widths.push(width);
			return [];
		},
		invalidate() {},
	};
}

/** Left click at column `x` of the first row, in a component `width` columns wide. */
function createMouseEvent(x: number, width: number): TuiMouseEvent {
	return {
		type: "click",
		button: "left",
		x,
		y: 0,
		screenX: x,
		screenY: 0,
		width,
		height: 1,
		shift: false,
		alt: false,
		ctrl: false,
	};
}
