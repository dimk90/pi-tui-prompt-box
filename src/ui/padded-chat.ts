/**
 * Pi's chat container moved right by the box margins, so colored message and tool blocks start in the same
 * column as the prompt box.
 */

import type { Component, TuiMouseEvent, TuiMouseEventResult } from "@earendil-works/pi-tui";

import { LEFT_MARGIN, RIGHT_MARGIN } from "./prompt-box-editor.ts";

// Pi's document container holds the header, the loaded resources, and the chat, in this order
const DOCUMENT_CHILD_COUNT = 3;
const CHAT_INDEX = 2;

/**
 * Component with child components, matched by shape like Pi's `Container`.
 */
interface ParentComponent extends Component {
	children: Component[];
}

/**
 * Replaces Pi's chat container in the TUI tree under `root` with a `PaddedChat` that wraps it.
 *
 * Pi gives extensions no reference to the chat, so it is found by the tree shape: the first root child is
 * the document container with three containers, and the chat is the last one. Pi keeps its own reference
 * to the chat and keeps adding messages to it, so the wrapper always shows the current content.
 *
 * @returns A function that puts the chat container back, or `undefined` when the tree has another shape,
 *          for example when the chat is already wrapped.
 */
export function padChat(root: Component): (() => void) | undefined {
	if (!isParent(root))
		return undefined;

	const document = root.children[0];
	if (!document || !isParent(document) || document.children.length !== DOCUMENT_CHILD_COUNT)
		return undefined;

	if (document.children.some((child) => !isParent(child)))
		return undefined;

	const chat = document.children[CHAT_INDEX];
	const paddedChat = new PaddedChat(chat);
	document.children[CHAT_INDEX] = paddedChat;

	return () => {
		const index = document.children.indexOf(paddedChat);
		if (index !== -1)
			document.children[index] = chat;
	};
}

/**
 * Renders `chat` narrower by the box margins and indents every line by the left margin.
 *
 * It has no `children`, so `padChat()` never wraps it again. Pi owns the wrapped chat container.
 */
export class PaddedChat implements Component {
	private readonly chat: Component;

	constructor(chat: Component) {
		this.chat = chat;
	}

	render(width: number): string[] {
		const innerWidth = width - LEFT_MARGIN - RIGHT_MARGIN;
		if (innerWidth < 1)
			return this.chat.render(width);

		const leftMargin = " ".repeat(LEFT_MARGIN);

		return this.chat.render(innerWidth).map((line) => leftMargin + line);
	}

	/**
	 * Passes mouse events to the chat in its own coordinates; events on the margins are not handled.
	 */
	handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
		const innerWidth = event.width - LEFT_MARGIN - RIGHT_MARGIN;
		if (innerWidth < 1)
			return this.chat.handleMouse?.(event);

		const x = event.x - LEFT_MARGIN;
		if (x < 0 || x >= innerWidth)
			return undefined;

		return this.chat.handleMouse?.({ ...event, x, width: innerWidth });
	}

	invalidate(): void {
		this.chat.invalidate();
	}
}

/**
 * Checks if `component` has a `children` array, as Pi's `Container` has.
 */
function isParent(component: Component): component is ParentComponent {
	return "children" in component && Array.isArray(component.children);
}
