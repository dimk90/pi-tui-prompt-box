/**
 * Pi's built-in footer moved right by the box margins, so it starts in the same column as the prompt box.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { type Component, stripTerminalSequences, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import type { RoutedModel } from "../routed-model.ts";
import { LEFT_MARGIN, RIGHT_MARGIN } from "./prompt-box-editor.ts";
import type { ReadRightPadding } from "./scrollbar-padding.ts";

// Index of the footer line with the token stats on the left and the model on the right
const STATS_LINE_INDEX = 1;

// Pi puts at least this many spaces between the stats and the model
const MIN_MODEL_GAP = 2;

/**
 * Model state the built-in footer shows; read on every render, as Pi's footer does.
 */
export interface FooterModelState {
	model: ExtensionContext["model"];
	thinkingLevel: string;
	/** Model a virtual `model` routed the latest response to; Pi's footer adds it after `→`. */
	routedModel?: RoutedModel;
}

/**
 * Finds Pi's built-in footer in the component tree under `root`.
 *
 * Pi gives extensions no reference to its footer, so the tree is searched. The footer is matched by its
 * methods, not with `instanceof`: Pi itself uses duck typing, as `instanceof` can fail across module copies.
 */
export function findBuiltInFooter(root: Component): Component | undefined {
	if (isBuiltInFooter(root))
		return root;

	if (!("children" in root) || !Array.isArray(root.children))
		return undefined;

	for (const child of root.children as Component[]) {
		const footer = findBuiltInFooter(child);
		if (footer)
			return footer;
	}

	return undefined;
}

/**
 * Removes the model part that Pi's built-in footer right-aligns on its stats line: `(provider) model • level`,
 * with ` → model • level` after it for a routed model.
 *
 * The prompt box status line already shows it. The line is changed only when it ends with exactly the text
 * Pi builds from `state`; otherwise, for example when Pi truncated it, it is returned unchanged.
 */
export function removeModelPart(line: string, state: FooterModelState): string {
	const { model, thinkingLevel, routedModel } = state;
	if (!model)
		return line;

	let modelPart = model.id;
	if (model.reasoning)
		modelPart += thinkingLevel === "off" ? " • thinking off" : ` • ${thinkingLevel}`;

	// Pi may show no routed model where the status line still does, for example after compaction
	const modelParts = [modelPart];
	if (routedModel) {
		const routedLevel = routedModel.thinkingLevel ? ` • ${routedModel.thinkingLevel}` : "";
		modelParts.unshift(`${modelPart} → ${routedModel.model.id}${routedLevel}`);
	}

	const plainLine = stripTerminalSequences(line);
	const gap = " ".repeat(MIN_MODEL_GAP);
	const candidates = modelParts.flatMap((part) => [`(${model.provider}) ${part}`, part]);
	for (const candidate of candidates) {
		if (!plainLine.endsWith(gap + candidate))
			continue;

		const statsWidth = visibleWidth(plainLine.slice(0, -candidate.length).trimEnd());
		return truncateToWidth(line, statsWidth, "");
	}

	return line;
}

/**
 * Renders `footer` narrower by the box margins and `readRightPadding()`, indents every line by the left
 * margin, and removes the model part from the stats line.
 *
 * Pi owns the wrapped footer and keeps updating it, so this component never disposes it.
 */
export class PaddedFooter implements Component {
	private readonly footer: Component;
	private readonly readModelState: () => FooterModelState;
	private readonly readRightPadding: ReadRightPadding;

	constructor(
		footer: Component,
		readModelState: () => FooterModelState,
		readRightPadding: ReadRightPadding = () => 0,
	) {
		this.footer = footer;
		this.readModelState = readModelState;
		this.readRightPadding = readRightPadding;
	}

	render(width: number): string[] {
		const innerWidth = width - LEFT_MARGIN - RIGHT_MARGIN - this.readRightPadding();
		if (innerWidth < 1)
			return this.footer.render(width);

		const leftMargin = " ".repeat(LEFT_MARGIN);
		const lines = this.footer.render(innerWidth);
		const modelState = this.readModelState();

		return lines.map((line, index) => {
			const content = index === STATS_LINE_INDEX ? removeModelPart(line, modelState) : line;
			return leftMargin + content;
		});
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
