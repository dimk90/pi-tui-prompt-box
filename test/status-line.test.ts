import assert from "node:assert/strict";
import { test } from "node:test";

import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";

import type { RoutedModel } from "../src/routed-model.ts";
import { formatStatus } from "../src/ui/status-line.ts";

const REASONING_MODEL = { name: "Big Pickle", provider: "opencode", reasoning: true } as NonNullable<
	ExtensionContext["model"]
>;

/**
 * Formats a plain status line for a model, with colors that keep the text unchanged.
 */
function formatPlainStatus(
	model: ExtensionContext["model"],
	thinkingLevel: string,
	routedModel?: RoutedModel,
): string {
	return formatStatus({
		theme: {
			fg: (_color: string, text: string) => text,
			getThinkingBorderColor: () => (text: string) => text,
		} as unknown as Theme,
		levelColor: (text) => text,
		bashMode: "off",
		model,
		getProviderName: (provider) => (provider === "opencode" ? "OpenCode Zen" : provider),
		thinkingLevel,
		routedModel,
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

test("formatStatus shows the routed model after the selected one, in the same format", () => {
	const router = { ...REASONING_MODEL, name: "Auto", provider: "router" };

	assert.equal(formatPlainStatus(router, "high", { model: REASONING_MODEL, thinkingLevel: "off" }),
		"Auto router · high  →  Big Pickle OpenCode Zen · thinking off");
	assert.equal(formatPlainStatus(router, "high", { model: REASONING_MODEL }),
		"Auto router · high  →  Big Pickle OpenCode Zen", "unknown level");
	assert.equal(formatPlainStatus(router, "high", { model: { ...REASONING_MODEL, reasoning: false }, thinkingLevel: "off" }),
		"Auto router · high  →  Big Pickle OpenCode Zen", "no reasoning support");
});

test("formatStatus colors the routed thinking level with the theme color of its own level", () => {
	const status = formatStatus({
		theme: {
			fg: (color: string, text: string) => `<${color}>${text}</>`,
			getThinkingBorderColor: (level: string) => (text: string) => `<thinking-${level}>${text}</>`,
		} as unknown as Theme,
		levelColor: (text) => `<level>${text}</>`,
		bashMode: "off",
		model: REASONING_MODEL,
		getProviderName: (provider) => provider,
		thinkingLevel: "high",
		routedModel: { model: REASONING_MODEL, thinkingLevel: "low" },
	});

	assert.ok(status.includes("<level>high</><dim>  →  </>"));
	assert.ok(status.endsWith("<dim> · </><thinking-low>low</>"));
});
