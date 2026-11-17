/**
 * Pi's chat messages restyled: user messages drawn as prompt boxes, and Pi's thinking level status hidden;
 * see doc/ui.md.
 */

import { UserMessageComponent } from "@earendil-works/pi-coding-agent";
import { type Component, Markdown, Spacer, stripTerminalSequences } from "@earendil-works/pi-tui";

import type { ReadBoxColors } from "./colors.ts";
import type { ParentComponent } from "./padded-containers.ts";
import { BAR_WIDTH, INNER_PADDING, renderBoxRow } from "./prompt-box-editor.ts";

// Pi's chat status after a thinking level change; the user message boxes show the level by their color
const THINKING_LEVEL_STATUS = /^Thinking level: \S+$/;
// The chat is already moved by the box margins
const NO_MARGINS = { left: 0, right: 0 };
// Fields of Pi's Markdown that draw the padding and the background of a user message
const MARKDOWN_BLOCK_FIELDS = ["paddingX", "paddingY", "defaultTextStyle"] as const;

/**
 * Look of the restyled chat messages.
 */
export interface ChatMessageStyle {
	/** Called on every render, so the user message boxes follow the terminal background like the prompt box. */
	readBoxColors: ReadBoxColors;
	/**
	 * Returns the accent bar color of a user message. Called once per message, when it is styled, with the
	 * session entry id Pi gave it; a message sent in this session has none. The returned color is called on
	 * every render.
	 */
	resolveBarColor: (messageId: string | undefined) => (text: string) => string;
}

/**
 * Restyles the messages of Pi's `chat` container: the ones it holds now and every one Pi adds later.
 *
 * User messages are drawn as prompt boxes, see {@link boxUserMessage}. Pi's thinking level status is hidden,
 * see {@link hideThinkingLevelStatus}. Only the `chat` instance and the message instances are changed, not
 * their classes.
 *
 * @returns A function that restores `chat` and the messages it still holds, or `undefined` when `chat` is
 *          already restyled.
 */
export function styleChatMessages(chat: ParentComponent, style: ChatMessageStyle): (() => void) | undefined {
	if (Object.hasOwn(chat, "addChild"))
		return undefined;

	const restoreFunctions = new WeakMap<Component, () => void>();
	const styleMessage = (message: Component, previous: Component | undefined) => {
		const restore = message instanceof UserMessageComponent
			? boxUserMessage(message, style)
			: hideThinkingLevelStatus(message, previous);
		if (restore)
			restoreFunctions.set(message, restore);
	};
	chat.children.forEach((message, index) => styleMessage(message, chat.children[index - 1]));

	const addChild = chat.addChild.bind(chat);
	chat.addChild = (message: Component): void => {
		styleMessage(message, chat.children.at(-1));
		addChild(message);
	};

	return () => {
		Reflect.deleteProperty(chat, "addChild");
		for (const message of chat.children)
			restoreFunctions.get(message)?.();
	};
}

/**
 * Makes the user `message` render as a prompt box: accent bar, and the text lines between a top and a bottom
 * padding row on the box background; see doc/ui.md.
 *
 * Pi's Markdown inside the message keeps rendering the text, without its own padding and background. Pi
 * replaces it when the `outputPad` setting changes, so it is looked up on every render. When it is not found,
 * or below the box minimum width, the message renders as Pi draws it.
 *
 * @returns A function that restores Pi's rendering.
 */
function boxUserMessage(message: UserMessageComponent, style: ChatMessageStyle): () => void {
	const render = message.render.bind(message);
	const barColor = style.resolveBarColor(readMessageId(message));
	let unpadded: { markdown: Markdown; restore: () => void } | undefined;
	const restoreMarkdown = () => {
		unpadded?.restore();
		unpadded = undefined;
	};

	message.render = (width: number): string[] => {
		const textWidth = width - BAR_WIDTH - 2 * INNER_PADDING;
		const markdown = textWidth < 1 ? undefined : findMarkdown(message);
		if (!markdown) {
			restoreMarkdown();
			return render(width);
		}

		if (unpadded?.markdown !== markdown)
			unpadded = { markdown, restore: unpadMarkdown(markdown) };

		const textLines = render(textWidth);
		if (textLines.length === 0)
			return textLines;

		const boxStyle = { margins: NO_MARGINS, barColor, colors: style.readBoxColors() };

		return [
			renderBoxRow("", textWidth, boxStyle),
			...textLines.map((line) => renderBoxRow(line, textWidth, boxStyle)),
			renderBoxRow("", textWidth, boxStyle),
		];
	};

	return () => {
		Reflect.deleteProperty(message, "render");
		restoreMarkdown();
	};
}

/**
 * Returns the session entry id of the user `message`, which Pi's types mark private, or `undefined` for a
 * message sent in this session.
 */
function readMessageId(message: UserMessageComponent): string | undefined {
	const messageId: unknown = Reflect.get(message, "messageId");

	return typeof messageId === "string" ? messageId : undefined;
}

/**
 * Finds Pi's Markdown that renders the text of the user `message`, or returns `undefined` when the message
 * has another shape.
 */
function findMarkdown(message: UserMessageComponent): Markdown | undefined {
	const markdown = message.children[0];
	if (!(markdown instanceof Markdown) || typeof Reflect.get(markdown, "paddingX") !== "number")
		return undefined;

	return markdown;
}

/**
 * Removes the padding and the background of `markdown`, so it renders only the text lines. Pi's types mark
 * these fields private.
 *
 * @returns A function that sets them back.
 */
function unpadMarkdown(markdown: Markdown): () => void {
	const fields = MARKDOWN_BLOCK_FIELDS.map((name) => [name, Reflect.get(markdown, name) as unknown] as const);
	const textStyle = Reflect.get(markdown, "defaultTextStyle") as unknown;

	Reflect.set(markdown, "paddingX", 0);
	Reflect.set(markdown, "paddingY", 0);
	Reflect.set(markdown, "defaultTextStyle", { ...(isObject(textStyle) ? textStyle : {}), bgColor: undefined });
	markdown.invalidate();

	return () => {
		for (const [name, value] of fields)
			Reflect.set(markdown, name, value);

		markdown.invalidate();
	};
}

/**
 * Hides Pi's `Thinking level: <level>` chat status: the `status` text and the `spacer` Pi adds before it.
 *
 * Pi shows later statuses in the same text component, so the text is checked on every render and only the
 * thinking level status is hidden. Pi does not export its status text class, so it is matched by its `build`
 * method; other components are left unchanged.
 *
 * @returns A function that shows the status again, or `undefined` when `status` is not a status text.
 */
function hideThinkingLevelStatus(status: Component, spacer: Component | undefined): (() => void) | undefined {
	if (!isStatusText(status))
		return undefined;

	const isHidden = () => THINKING_LEVEL_STATUS.test(stripTerminalSequences(status.build()).trim());
	const showStatus = hideWhile(status, isHidden);
	const showSpacer = spacer instanceof Spacer ? hideWhile(spacer, isHidden) : undefined;

	return () => {
		showStatus();
		showSpacer?.();
	};
}

/**
 * Pi's status text, which builds its themed text on demand.
 */
interface StatusText extends Component {
	build: () => string;
}

/**
 * Checks if `component` has a `build` method, as Pi's status text has.
 */
function isStatusText(component: Component): component is StatusText {
	return "build" in component && typeof component.build === "function";
}

/**
 * Makes `component` render no lines while `isHidden()` returns `true`.
 *
 * @returns A function that removes the check.
 */
function hideWhile(component: Component, isHidden: () => boolean): () => void {
	const render = component.render.bind(component);
	component.render = (width: number): string[] => (isHidden() ? [] : render(width));

	return () => {
		Reflect.deleteProperty(component, "render");
	};
}

/**
 * Checks if `value` is a non-null object.
 */
function isObject(value: unknown): value is object {
	return typeof value === "object" && value !== null;
}
