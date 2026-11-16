import assert from "node:assert/strict";
import { test } from "node:test";

import { SessionManager } from "@earendil-works/pi-coding-agent";

import { findPromptThinkingLevel } from "../src/prompt-thinking-level.ts";

test("findPromptThinkingLevel returns the level set before the entry on its branch", () => {
	const sessionManager = SessionManager.inMemory("/tmp");
	sessionManager.appendThinkingLevelChange("low");
	const firstPrompt = appendPrompt(sessionManager, "first");
	const levelChange = sessionManager.appendThinkingLevelChange("high");
	const secondPrompt = appendPrompt(sessionManager, "second");

	assert.equal(findPromptThinkingLevel(sessionManager, firstPrompt), "low");
	assert.equal(findPromptThinkingLevel(sessionManager, secondPrompt), "high");
	assert.equal(findPromptThinkingLevel(sessionManager, levelChange), "high");
});

test("findPromptThinkingLevel returns undefined for an unknown entry or a branch without a level", () => {
	const sessionManager = SessionManager.inMemory("/tmp");
	const prompt = appendPrompt(sessionManager, "first");

	assert.equal(findPromptThinkingLevel(sessionManager, prompt), undefined);
	assert.equal(findPromptThinkingLevel(sessionManager, "missing"), undefined);
});

/** Appends a user message with `text` and returns its entry id. */
function appendPrompt(sessionManager: SessionManager, text: string): string {
	return sessionManager.appendMessage({ role: "user", content: text, timestamp: 0 });
}
