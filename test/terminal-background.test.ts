import assert from "node:assert/strict";
import { test } from "node:test";

import type { RgbColor, TerminalColors, TUI } from "@earendil-works/pi-tui";

import { watchTerminalBackground } from "../src/terminal-background.ts";

test("watchTerminalBackground reports the background now, on late replies, and on light/dark changes", async () => {
	const tui = createTui();
	const reported: RgbColor[] = [];
	const stop = watchTerminalBackground(tui.tui, (background) => reported.push(background));

	await tui.reply({ background: { r: 1, g: 2, b: 3 } });
	assert.deepEqual(reported, [{ r: 1, g: 2, b: 3 }]);

	tui.lateReply({ background: { r: 4, g: 5, b: 6 } });
	assert.deepEqual(reported.at(-1), { r: 4, g: 5, b: 6 });

	tui.changeScheme();
	await tui.reply({ background: { r: 7, g: 8, b: 9 } });
	assert.deepEqual(reported.at(-1), { r: 7, g: 8, b: 9 }, "queried again after the change");

	tui.changeScheme();
	await tui.reply({});
	assert.equal(reported.length, 3, "a reply without a background keeps the last one");

	stop();
	tui.changeScheme();
	assert.equal(tui.queryCount(), 3, "no query after stop");
	tui.lateReply({ background: { r: 0, g: 0, b: 0 } });
	assert.equal(reported.length, 3, "late replies after stop are ignored");
});

/**
 * Creates a TUI stub that records color queries and lets the test answer the last one.
 */
function createTui() {
	const queries: Array<{ resolve: (colors: TerminalColors) => void; onLateReply?: (colors: TerminalColors) => void }> =
		[];
	const schemeListeners = new Set<() => void>();
	const tui = {
		queryTerminalColors: (options: { onLateReply?: (colors: TerminalColors) => void }) =>
			new Promise<TerminalColors>((resolve) => queries.push({ resolve, onLateReply: options.onLateReply })),
		onTerminalColorSchemeChange: (listener: () => void) => {
			schemeListeners.add(listener);
			return () => schemeListeners.delete(listener);
		},
	} as unknown as TUI;

	return {
		tui,
		queryCount: () => queries.length,
		reply: async (colors: TerminalColors) => {
			queries.at(-1)?.resolve(colors);
			await Promise.resolve();
		},
		lateReply: (colors: TerminalColors) => queries.at(-1)?.onLateReply?.(colors),
		changeScheme: () => {
			for (const listener of schemeListeners)
				listener();
		},
	};
}
