import assert from "node:assert/strict";
import { test } from "node:test";

import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";

import { formatStatus } from "../src/ui/status-line.ts";

test("formatStatus shows the provider display name after the model name", () => {
	const model = { name: "Big Pickle", provider: "opencode" } as NonNullable<ExtensionContext["model"]>;
	const status = formatStatus({
		theme: { fg: (_color: string, text: string) => text } as unknown as Theme,
		levelColor: (text) => text,
		bashMode: "off",
		model,
		getProviderName: (provider) => (provider === "opencode" ? "OpenCode Zen" : provider),
		thinkingLevel: "medium",
	});

	assert.equal(status, "Big Pickle OpenCode Zen · medium");
});
