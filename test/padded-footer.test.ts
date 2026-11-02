import assert from "node:assert/strict";
import { test } from "node:test";

import { FooterComponent, type ReadonlyFooterDataProvider } from "@earendil-works/pi-coding-agent";
import { type Component, Container } from "@earendil-works/pi-tui";

import { findBuiltInFooter, PaddedFooter } from "../src/ui/padded-footer.ts";
import { LEFT_MARGIN, RIGHT_MARGIN } from "../src/ui/prompt-box-editor.ts";
import { createRuntime } from "./harness/runtime.ts";

test("findBuiltInFooter finds Pi's footer nested in containers", async (t) => {
	const runtime = await createRuntime(t, { extensions: [] });
	const footer = new FooterComponent(runtime.session, createFooterData());
	const footerContainer = new Container();
	footerContainer.addChild(footer);
	const root = new Container();
	root.addChild(new Container());
	root.addChild(footerContainer);

	assert.equal(findBuiltInFooter(root), footer);
	assert.equal(findBuiltInFooter(new Container()), undefined);
});

test("PaddedFooter narrows the footer by the margins and indents every line", () => {
	const widths: number[] = [];
	const footer: Component = {
		render(width) {
			widths.push(width);
			return ["first", "second"];
		},
		invalidate() {},
	};
	const indent = " ".repeat(LEFT_MARGIN);

	assert.deepEqual(new PaddedFooter(footer).render(80), [`${indent}first`, `${indent}second`]);
	assert.deepEqual(widths, [80 - LEFT_MARGIN - RIGHT_MARGIN]);
});

/** Footer data with no git branch, one provider, and no extension statuses. */
function createFooterData(): ReadonlyFooterDataProvider {
	return {
		getGitBranch: () => null,
		getExtensionStatuses: () => new Map(),
		getAvailableProviderCount: () => 1,
		onBranchChange: () => () => {},
	};
}
