import assert from "node:assert/strict";
import { test } from "node:test";

import { type ExtensionContext, FooterComponent, type ReadonlyFooterDataProvider } from "@earendil-works/pi-coding-agent";
import { type Component, Container, stripTerminalSequences } from "@earendil-works/pi-tui";

import { findBuiltInFooter, PaddedFooter, removeModelPart } from "../src/ui/padded-footer.ts";
import { LEFT_MARGIN, RIGHT_MARGIN } from "../src/ui/prompt-box-editor.ts";
import { createRuntime } from "./harness/runtime.ts";

type Model = NonNullable<ExtensionContext["model"]>;

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
	const footerWithoutModel = new PaddedFooter(footer, () => ({ model: undefined, thinkingLevel: "off" }));

	assert.deepEqual(footerWithoutModel.render(80), [`${indent}first`, `${indent}second`]);
	assert.deepEqual(widths, [80 - LEFT_MARGIN - RIGHT_MARGIN]);

	const footerWithPadding = new PaddedFooter(footer, () => ({ model: undefined, thinkingLevel: "off" }), () => 1);
	footerWithPadding.render(80);
	assert.equal(widths[1], 80 - LEFT_MARGIN - RIGHT_MARGIN - 1, "right padding");
});

test("PaddedFooter removes the model part from the stats line only, with and without the provider", () => {
	const model = createModel({ reasoning: false });
	const indent = " ".repeat(LEFT_MARGIN);

	for (const modelPart of ["model", "(provider) model"]) {
		// Same styling as Pi's footer: stats and the rest are dimmed separately
		const statsLine = `\x1b[2m↑1k 0.0%/100k\x1b[22m\x1b[2m  ${modelPart}\x1b[22m`;
		const footer: Component = { render: () => ["~/project  model", statsLine], invalidate() {} };
		const lines = new PaddedFooter(footer, () => ({ model, thinkingLevel: "off" })).render(80);

		assert.deepEqual(lines.map(stripTerminalSequences), [`${indent}~/project  model`, `${indent}↑1k 0.0%/100k`]);
	}
});

test("removeModelPart removes the thinking level of reasoning models", () => {
	const model = createModel({ reasoning: true });

	assert.equal(stripTerminalSequences(removeModelPart("\x1b[2m0.0%/100k  model • high\x1b[0m", { model, thinkingLevel: "high" })),
		"0.0%/100k");
	assert.equal(stripTerminalSequences(removeModelPart("0.0%/100k  model • thinking off", { model, thinkingLevel: "off" })),
		"0.0%/100k");
});

test("removeModelPart keeps lines that do not end with the exact model part", () => {
	const model = createModel({ reasoning: false });
	const lines = [
		"0.0%/100k  mod",
		"0.0%/100k  model → routed",
		"0.0%/100k other-model",
		"0.0%/100k (provider) model",
	];

	for (const line of lines) assert.equal(removeModelPart(line, { model, thinkingLevel: "off" }), line);
	assert.equal(removeModelPart("0.0%/100k  model", { model: undefined, thinkingLevel: "off" }), "0.0%/100k  model");
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

/** A model with id `model` from `provider`; only the fields the footer reads matter. */
function createModel(options: { reasoning: boolean }): Model {
	return {
		provider: "provider", id: "model", name: "Model", api: "openai-completions", baseUrl: "http://localhost",
		reasoning: options.reasoning, input: ["text"], contextWindow: 100_000, maxTokens: 128,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	};
}
