/**
 * Pi's built-in footer moved right by the box margins, so it starts in the same column as the prompt box.
 */

import type { Component } from "@earendil-works/pi-tui";

import { LEFT_MARGIN, RIGHT_MARGIN } from "./prompt-box-editor.ts";

/**
 * Finds Pi's built-in footer in the component tree under `root`.
 *
 * Pi gives extensions no reference to its footer, so the tree is searched. The footer is matched by its
 * methods, not with `instanceof`: Pi itself uses duck typing, as `instanceof` can fail across module copies.
 */
export function findBuiltInFooter(root: Component): Component | undefined {
	if (isBuiltInFooter(root)) return root;
	if (!("children" in root) || !Array.isArray(root.children)) return undefined;
	for (const child of root.children as Component[]) {
		const footer = findBuiltInFooter(child);
		if (footer) return footer;
	}
	return undefined;
}

/**
 * Renders `footer` narrower by the box margins and indents every line by the left margin.
 *
 * Pi owns the wrapped footer and keeps updating it, so this component never disposes it.
 */
export class PaddedFooter implements Component {
	private readonly footer: Component;

	constructor(footer: Component) {
		this.footer = footer;
	}

	render(width: number): string[] {
		const innerWidth = width - LEFT_MARGIN - RIGHT_MARGIN;
		if (innerWidth < 1) return this.footer.render(width);
		const leftMargin = " ".repeat(LEFT_MARGIN);
		return this.footer.render(innerWidth).map((line) => leftMargin + line);
	}

	invalidate(): void {
		this.footer.invalidate();
	}
}

/**
 * Tells Pi's `FooterComponent` apart from other components by the methods only it has.
 */
function isBuiltInFooter(component: Component): boolean {
	return "setSession" in component && "setAutoCompactEnabled" in component;
}
