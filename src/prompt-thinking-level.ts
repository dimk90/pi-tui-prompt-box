/**
 * Thinking level of a past prompt, read from the session.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

/**
 * Finds the thinking level that was set when the session entry `entryId` was added: the level of the nearest
 * thinking level change above it on its branch.
 *
 * Pi records the level at session start and on every change, so only an unknown entry returns `undefined`.
 */
export function findPromptThinkingLevel(
	sessionManager: Pick<ExtensionContext["sessionManager"], "getEntry">,
	entryId: string,
): string | undefined {
	let entry = sessionManager.getEntry(entryId);
	while (entry) {
		if (entry.type === "thinking_level_change")
			return entry.thinkingLevel;

		entry = entry.parentId ? sessionManager.getEntry(entry.parentId) : undefined;
	}

	return undefined;
}
