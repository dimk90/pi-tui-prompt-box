/**
 * Pi's chat, queued messages, extension widgets, and the dialogs shown in place of the editor moved right by the
 * box margins, so they start in the same column as the prompt box, and kept clear of Pi's fullscreen scrollbar.
 */

import type { Component, TuiMouseEvent, TuiMouseEventResult } from "@earendil-works/pi-tui";

import { LEFT_MARGIN, RIGHT_MARGIN } from "./prompt-box-editor.ts";
import { type ReadRightPadding, readScrollbarPadding } from "./scrollbar-padding.ts";

// Pi's TUI children, in this order: document, queued messages, status, widgets above, editor,
// widgets below, footer
const ROOT_CHILD_COUNT = 7;
const EDITOR_INDEX = 4;
const PADDED_ROOT_INDEXES = [1, 3, 5];
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
 * Moves Pi's chat, queued messages, widgets above and below the editor, and the dialogs shown in place of the
 * editor right by the box margins.
 *
 * Pi gives extensions no references to these containers, so they are found by the shape of the TUI tree
 * under `root`, starting from the root child that holds `editor`. Nothing is changed when the shape differs.
 * The editor container is padded only while it does not hold `editor`, which draws its own margins: Pi shows
 * its selectors and extension dialogs in the same container, in place of the editor.
 * In fullscreen mode with the `auto` scrollbar, they are also narrowed by the scrollbar width; see
 * {@link readScrollbarPadding}.
 *
 * @returns A function that removes the padding, or `undefined` when nothing was changed, for example
 *          because the containers are already padded.
 */
export function padPiContainers(root: Component, editor: Component): (() => void) | undefined {
	const containers = findPiContainers(root, editor);
	if (!containers || [...containers.alwaysPadded, containers.editorContainer].some(isPadded))
		return undefined;

	const readRightPadding = () => readScrollbarPadding(root);
	const restoreFunctions = containers.alwaysPadded.map((container) => padComponent(container, readRightPadding));
	const { editorContainer } = containers;
	const isDialogShown = () => !editorContainer.children.includes(editor);
	restoreFunctions.push(padComponent(editorContainer, readRightPadding, isDialogShown));
	return () => {
		for (const restore of restoreFunctions) restore();
	};
}

/**
 * Makes `component` render narrower by the box margins and `readRightPadding()`, with every line indented by
 * the left margin.
 *
 * Only this instance is changed, not its class, so Pi keeps its own reference and keeps updating it, in
 * both regular and fullscreen mode. Mouse events are passed in the component coordinates; events on the
 * margins are not handled. `readRightPadding` is called on every render and mouse event, so the padding
 * follows Pi's mode and settings. `shouldPad` is called the same way; while it returns `false`, the component
 * renders and gets mouse events unchanged.
 *
 * @returns A function that removes the padding.
 */
export function padComponent(
	component: Component,
	readRightPadding: ReadRightPadding = () => 0,
	shouldPad: () => boolean = () => true,
): () => void {
	const render = component.render.bind(component);
	const handleMouse = component.handleMouse?.bind(component);
	const readInnerWidth = (width: number) => width - LEFT_MARGIN - RIGHT_MARGIN - readRightPadding();

	component.render = (width: number): string[] => {
		if (!shouldPad()) return render(width);
		const innerWidth = readInnerWidth(width);
		if (innerWidth < 1) return render(width);
		const leftMargin = " ".repeat(LEFT_MARGIN);
		return render(innerWidth).map((line) => leftMargin + line);
	};
	if (handleMouse) {
		component.handleMouse = (event: TuiMouseEvent): TuiMouseEventResult | undefined => {
			if (!shouldPad()) return handleMouse(event);
			const innerWidth = readInnerWidth(event.width);
			if (innerWidth < 1) return handleMouse(event);
			const x = event.x - LEFT_MARGIN;
			if (x < 0 || x >= innerWidth) return undefined;
			return handleMouse({ ...event, x, width: innerWidth });
		};
	}

	return () => {
		Reflect.deleteProperty(component, "render");
		Reflect.deleteProperty(component, "handleMouse");
	};
}

/**
 * Pi's containers that get the padding.
 */
interface PiContainers {
	/** Chat, queued messages, and widgets above and below the editor. */
	alwaysPadded: Component[];
	/** Holds the editor, or a selector or extension dialog shown in its place. */
	editorContainer: ParentComponent;
}

/**
 * Finds Pi's chat, queued messages, widget, and editor containers, or returns `undefined` when the tree has
 * another shape.
 */
function findPiContainers(root: Component, editor: Component): PiContainers | undefined {
	if (!isParent(root) || root.children.length !== ROOT_CHILD_COUNT) return undefined;
	if (root.children.some((child) => !isParent(child))) return undefined;
	const rootChildren = root.children as ParentComponent[];
	const editorContainer = rootChildren[EDITOR_INDEX];
	if (!editorContainer?.children.includes(editor)) return undefined;

	const document = rootChildren[0];
	if (!document || document.children.length !== DOCUMENT_CHILD_COUNT) return undefined;
	const chat = document.children[CHAT_INDEX];
	if (!chat || !isParent(chat)) return undefined;

	const alwaysPadded = [chat, ...PADDED_ROOT_INDEXES.map((index) => rootChildren[index] as Component)];
	return { alwaysPadded, editorContainer };
}

/**
 * Checks if `component` was already padded: Pi's containers take `render` from their class.
 */
function isPadded(component: Component): boolean {
	return Object.hasOwn(component, "render");
}

/**
 * Checks if `component` has a `children` array, as Pi's `Container` has.
 */
function isParent(component: Component): component is ParentComponent {
	return "children" in component && Array.isArray(component.children);
}
