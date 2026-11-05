/**
 * Pi's chat, queued messages, and extension widgets moved right by the box margins, so they start in the same
 * column as the prompt box.
 */

import type { Component, TuiMouseEvent, TuiMouseEventResult } from "@earendil-works/pi-tui";

import { LEFT_MARGIN, RIGHT_MARGIN } from "./prompt-box-editor.ts";

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
 * Moves Pi's chat, queued messages, and widgets above and below the editor right by the box margins.
 *
 * Pi gives extensions no references to these containers, so they are found by the shape of the TUI tree
 * under `root`, starting from the root child that holds `editor`. Nothing is changed when the shape differs.
 *
 * @returns A function that removes the padding, or `undefined` when nothing was changed, for example
 *          because the containers are already padded.
 */
export function padPiContainers(root: Component, editor: Component): (() => void) | undefined {
	const containers = findPiContainers(root, editor);
	if (!containers || containers.some(isPadded)) return undefined;
	const restoreFunctions = containers.map(padComponent);
	return () => {
		for (const restore of restoreFunctions) restore();
	};
}

/**
 * Makes `component` render narrower by the box margins, with every line indented by the left margin.
 *
 * Only this instance is changed, not its class, so Pi keeps its own reference and keeps updating it, in
 * both regular and fullscreen mode. Mouse events are passed in the component coordinates; events on the
 * margins are not handled.
 *
 * @returns A function that removes the padding.
 */
export function padComponent(component: Component): () => void {
	const render = component.render.bind(component);
	const handleMouse = component.handleMouse?.bind(component);

	component.render = (width: number): string[] => {
		const innerWidth = width - LEFT_MARGIN - RIGHT_MARGIN;
		if (innerWidth < 1) return render(width);
		const leftMargin = " ".repeat(LEFT_MARGIN);
		return render(innerWidth).map((line) => leftMargin + line);
	};
	if (handleMouse) {
		component.handleMouse = (event: TuiMouseEvent): TuiMouseEventResult | undefined => {
			const innerWidth = event.width - LEFT_MARGIN - RIGHT_MARGIN;
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
 * Finds Pi's chat, queued messages, and widget containers, or returns `undefined` when the tree has another shape.
 */
function findPiContainers(root: Component, editor: Component): Component[] | undefined {
	if (!isParent(root) || root.children.length !== ROOT_CHILD_COUNT) return undefined;
	if (root.children.some((child) => !isParent(child))) return undefined;
	const rootChildren = root.children as ParentComponent[];
	if (!rootChildren[EDITOR_INDEX]?.children.includes(editor)) return undefined;

	const document = rootChildren[0];
	if (!document || document.children.length !== DOCUMENT_CHILD_COUNT) return undefined;
	const chat = document.children[CHAT_INDEX];
	if (!chat || !isParent(chat)) return undefined;

	return [chat, ...PADDED_ROOT_INDEXES.map((index) => rootChildren[index] as Component)];
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
