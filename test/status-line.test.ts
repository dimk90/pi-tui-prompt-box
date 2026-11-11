import assert from "node:assert/strict";
import { test } from "node:test";

import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";

import { formatStatus } from "../src/ui/status-line.ts";

const REASONING_MODEL = { name: "Big Pickle", provider: "opencode", reasoning: true } as NonNullable<
	ExtensionContext["model"]
>;

/**
 * Formats a plain status line for a model, with colors that keep the text unchanged.
 */
function formatPlainStatus(model: ExtensionContext["model"], thinkingLevel: string): string {
	return formatStatus({
		theme: { fg: (_color: string, text: string) => text } as unknown as Theme,
		levelColor: (text) => text,
		bashMode: "off",
		model,
		getProviderName: (provider) => (provider === "opencode" ? "OpenCode Zen" : provider),
		thinkingLevel,
	});
}

test("formatStatus shows the provider display name after the model name", () => {
	assert.equal(formatPlainStatus(REASONING_MODEL, "medium"), "Big Pickle OpenCode Zen · medium");
});

test("formatStatus shows `thinking off` for a reasoning model with thinking off", () => {
	assert.equal(formatPlainStatus(REASONING_MODEL, "off"), "Big Pickle OpenCode Zen · thinking off");
});

test("formatStatus hides the thinking level for a model without reasoning support", () => {
	const model = { ...REASONING_MODEL, name: "Gemma 3", provider: "ollama", reasoning: false };
	assert.equal(formatPlainStatus(model, "off"), "Gemma 3 ollama");
});

test("formatStatus hides the thinking level without a model", () => {
	assert.equal(formatPlainStatus(undefined, "off"), "no model");
});
