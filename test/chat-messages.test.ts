import assert from "node:assert/strict";
import { test } from "node:test";

import { UserMessageComponent } from "@earendil-works/pi-coding-agent";
import {
	type Component,
	Container,
	type MarkdownTheme,
	Spacer,
	stripTerminalSequences,
	visibleWidth,
} from "@earendil-works/pi-tui";

import { type ChatMessageStyle, styleChatMessages } from "../src/ui/chat-messages.ts";
import { RESET } from "../src/ui/colors.ts";

const BOX_COLORS = { background: "\x1b[48;2;31;31;31m", halfBlock: "\x1b[38;2;31;31;31m" };
// Background Pi's user message gets in these tests, in place of the theme color
const PI_BACKGROUND = "\x1b[48;5;1m";
const PLAIN = (text: string) => text;
const MARKDOWN_THEME: MarkdownTheme = {
	heading: PLAIN, link: PLAIN, linkUrl: PLAIN, code: PLAIN, codeBlock: PLAIN, codeBlockBorder: PLAIN, quote: PLAIN,
	quoteBorder: PLAIN, hr: PLAIN, listBullet: PLAIN, bold: PLAIN, italic: PLAIN, strikethrough: PLAIN, underline: PLAIN,
};

test("styleChatMessages draws user messages as prompt boxes, also the ones added later", () => {
	const chat = new Container();
	chat.addChild(createUserMessage("first"));
	styleChatMessages(chat, createStyle());
	chat.addChild(createUserMessage("second line\n\nthird"));

	const lines = chat.render(40);
	assert.deepEqual(lines.map(readRow), [
		"<bar>┃</>", "<bar>┃</>  first", "<bar>┃</>",
		"<bar>┃</>", "<bar>┃</>  second line", "<bar>┃</>", "<bar>┃</>  third", "<bar>┃</>",
	]);
	for (const line of lines) {
		assert.equal(visibleWidth(line.replaceAll(/<\/?(bar)?>/g, "")), 40);
		assert.ok(!line.includes(PI_BACKGROUND), "Pi's background is dropped");
	}
	assert.ok(lines[1]?.includes(`${RESET}${BOX_COLORS.background}  `));
});

test("styleChatMessages resolves the bar color once per message from its entry id", () => {
	const chat = new Container();
	const messageIds: Array<string | undefined> = [];
	const style = createStyle((messageId) => {
		messageIds.push(messageId);
		return (text) => `<${messageId ?? "live"}>${text}</>`;
	});
	chat.addChild(createUserMessage("resumed", "entry-1"));
	styleChatMessages(chat, style);
	chat.addChild(createUserMessage("sent now"));
	chat.render(40);

	assert.deepEqual(messageIds, ["entry-1", undefined]);
	const rows = chat.render(40).map(readRow);
	assert.equal(rows[1], "<entry-1>┃</>  resumed");
	assert.equal(rows[4], "<live>┃</>  sent now");
});

test("styleChatMessages keeps the box after Pi rebuilds the message, and Pi's look below the minimum width", () => {
	const chat = new Container();
	const message = createUserMessage("text");
	chat.addChild(message);
	styleChatMessages(chat, createStyle());
	chat.render(40);

	message.setOutputPad(3);
	setPlainTextStyle(message);
	assert.equal(readRow(chat.render(40)[1] ?? ""), "<bar>┃</>  text");

	const narrowLines = chat.render(4);
	assert.ok(narrowLines.every((line) => !line.includes("┃")));
	assert.ok(narrowLines.some((line) => line.includes(PI_BACKGROUND)));
});

test("styleChatMessages hides only the thinking level status and its spacer", () => {
	const chat = new Container();
	styleChatMessages(chat, createStyle());
	let message = "Thinking level: high";
	chat.addChild(new Spacer(1));
	chat.addChild(createStatusText(() => `\x1b[2m${message}\x1b[0m`));
	assert.deepEqual(chat.render(40), []);

	// Pi shows the next status in the same component
	message = "Default thinking level: high";
	assert.deepEqual(chat.render(40).map(stripTerminalSequences), ["", message]);
});

test("styleChatMessages restores the chat and its messages", () => {
	const chat = new Container();
	const message = createUserMessage("text");
	const status = createStatusText(() => "Thinking level: low");
	const piLines = message.render(40);
	chat.addChild(message);
	const restore = styleChatMessages(chat, createStyle());
	assert.ok(restore);
	assert.equal(styleChatMessages(chat, createStyle()), undefined, "styled chats are not styled again");
	chat.addChild(new Spacer(1));
	chat.addChild(status);
	chat.render(40);

	restore();
	assert.equal(Object.hasOwn(chat, "addChild"), false);
	assert.deepEqual(chat.render(40), [...piLines, "", "Thinking level: low"]);

	const laterMessage = createUserMessage("later");
	chat.addChild(laterMessage);
	assert.equal(Object.hasOwn(laterMessage, "render"), false);
});

/** Style with fixed box colors and a bar color that tags the bar, so tests can read it. */
function createStyle(
	resolveBarColor: ChatMessageStyle["resolveBarColor"] = () => (text) => `<bar>${text}</>`,
): ChatMessageStyle {
	return { readBoxColors: () => BOX_COLORS, resolveBarColor };
}

/** Pi's user message with `text`, with a text style that needs no initialized Pi theme. */
function createUserMessage(text: string, messageId?: string): UserMessageComponent {
	const message = new UserMessageComponent(text, MARKDOWN_THEME, 1, [], messageId);
	setPlainTextStyle(message);
	return message;
}

/** Replaces the theme colors of the Markdown of `message`, which Pi reads from its global theme. */
function setPlainTextStyle(message: UserMessageComponent): void {
	const markdown = message.children[0];
	assert.ok(markdown);
	Reflect.set(markdown, "defaultTextStyle", { color: PLAIN, bgColor: (line: string) => `${PI_BACKGROUND}${line}\x1b[49m` });
}

/** Component like Pi's status text: one line built on every render, with `render` on the class as Pi has it. */
class StatusText implements Component {
	public readonly build: () => string;

	constructor(build: () => string) {
		this.build = build;
	}

	render(): string[] {
		return [this.build()];
	}

	invalidate(): void {}
}

/** Creates a status text that shows the result of `build`. */
function createStatusText(build: () => string): StatusText {
	return new StatusText(build);
}

/** Returns the visible text of a rendered row without trailing spaces, with the test color tags kept. */
function readRow(line: string): string {
	return stripTerminalSequences(line).trimEnd();
}
