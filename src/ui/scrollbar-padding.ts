/**
 * Right padding that keeps the chat, the prompt box, and the footer clear of Pi's fullscreen scrollbar.
 */

import type { Component } from "@earendil-works/pi-tui";

// Pi's fullscreen scrollbar in `auto` mode is drawn over the last column of the chat, so that column is left empty
const SCROLLBAR_WIDTH = 1;

/**
 * Function that returns the columns to leave empty on the right of a component, besides the box margin.
 */
export type ReadRightPadding = () => number;

/**
 * Returns the columns to leave for Pi's fullscreen scrollbar: its width in the `auto` mode, else 0.
 *
 * In `auto` mode Pi draws the scrollbar over the last column of the chat when it scrolls. In `always` mode
 * Pi already narrows the chat for it; `hidden` mode and regular TUI mode have no scrollbar. Pi gives
 * extensions no reference to its scroll view, so it is found by shape among the children of the fullscreen
 * layout root of `tui`: the child that holds the document, the first TUI child, and has a `scrollbar` mode.
 * Pi replaces the TUI on a mode switch, and `tui` follows it, so call this on every render.
 */
export function readScrollbarPadding(tui: Component): number {
	const document = readChildren(tui)?.[0];
	if (!document)
		return 0;

	// Pi keeps the fullscreen layout root in a field that its types mark private
	const layoutRoot: unknown = Reflect.get(tui, "layoutRoot");
	const scrollView = readChildren(layoutRoot)?.find((child) => readChildren(child)?.[0] === document);
	if (!isObject(scrollView) || !("scrollbar" in scrollView) || scrollView.scrollbar !== "auto")
		return 0;

	return SCROLLBAR_WIDTH;
}

/**
 * Returns the `children` array of `value`, as Pi's `Container` has, or `undefined` when it has none.
 */
function readChildren(value: unknown): unknown[] | undefined {
	if (!isObject(value) || !("children" in value) || !Array.isArray(value.children))
		return undefined;

	return value.children;
}

/**
 * Checks if `value` is a non-null object.
 */
function isObject(value: unknown): value is object {
	return typeof value === "object" && value !== null;
}
