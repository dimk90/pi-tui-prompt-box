import assert from "node:assert/strict";
import { test } from "node:test";

import { type Component, Container, type TuiMouseEvent } from "@earendil-works/pi-tui";

import { PaddedChat, padChat } from "../src/ui/padded-chat.ts";
import { LEFT_MARGIN, RIGHT_MARGIN } from "../src/ui/prompt-box-editor.ts";

test("padChat wraps Pi's chat container and restores it", () => {
	const { root, document, chat } = createTree();

	const restore = padChat(root);
	assert.ok(restore);
	assert.ok(document.children[2] instanceof PaddedChat);
	assert.equal(padChat(root), undefined, "an already wrapped chat is not wrapped again");

	restore();
	assert.equal(document.children[2], chat);
});

test("padChat leaves other tree shapes unchanged", () => {
	const root = new Container();
	assert.equal(padChat(root), undefined);

	const document = new Container();
	document.addChild(new Container());
	document.addChild(new Container());
	root.addChild(document);
	assert.equal(padChat(root), undefined);
	assert.equal(document.children.length, 2);
});

test("PaddedChat narrows the chat by the margins and indents every line", () => {
	const widths: number[] = [];
	const chat: Component = {
		render(width) {
			widths.push(width);
			return ["first", "second"];
		},
		invalidate() {},
	};
	const indent = " ".repeat(LEFT_MARGIN);

	assert.deepEqual(new PaddedChat(chat).render(80), [`${indent}first`, `${indent}second`]);
	assert.deepEqual(widths, [80 - LEFT_MARGIN - RIGHT_MARGIN]);
});

test("PaddedChat passes mouse events in chat coordinates and ignores the margins", () => {
	const events: TuiMouseEvent[] = [];
	const chat: Component = {
		render: () => [],
		handleMouse(event) {
			events.push(event);
			return { handled: true };
		},
		invalidate() {},
	};
	const paddedChat = new PaddedChat(chat);
	const innerWidth = 80 - LEFT_MARGIN - RIGHT_MARGIN;

	assert.deepEqual(paddedChat.handleMouse(createMouseEvent(LEFT_MARGIN + 5, 80)), { handled: true });
	assert.equal(events[0]?.x, 5);
	assert.equal(events[0]?.width, innerWidth);

	if (LEFT_MARGIN > 0) assert.equal(paddedChat.handleMouse(createMouseEvent(LEFT_MARGIN - 1, 80)), undefined);
	assert.equal(paddedChat.handleMouse(createMouseEvent(LEFT_MARGIN + innerWidth, 80)), undefined);
	assert.equal(events.length, 1);
});

/** TUI tree with the same shape as Pi's: document container with header, loaded resources, and chat. */
function createTree(): { root: Container; document: Container; chat: Container } {
	const chat = new Container();
	const document = new Container();
	document.addChild(new Container());
	document.addChild(new Container());
	document.addChild(chat);
	const root = new Container();
	root.addChild(document);
	root.addChild(new Container());
	return { root, document, chat };
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
