/**
 * Terminal background color, as the terminal reports it, for the box background.
 */

import type { RgbColor, TerminalColors, TUI } from "@earendil-works/pi-tui";

// Pi waits as long for the terminal colors at startup
const QUERY_TIMEOUT_MS = 100;

/**
 * Queries the terminal colors now and on every light/dark change the terminal reports, and passes each
 * reported background to `onChange`, also replies that arrive after the timeout. Pi keeps the colors it
 * read private, so the extension asks the terminal itself. Returns a function that stops watching;
 * replies that arrive after it are ignored.
 */
export function watchTerminalBackground(tui: TUI, onChange: (background: RgbColor) => void): () => void {
	let stopped = false;
	const report = (colors: TerminalColors) => {
		if (!stopped && colors.background)
			onChange(colors.background);
	};
	const query = () => {
		void tui.queryTerminalColors({ timeoutMs: QUERY_TIMEOUT_MS, onLateReply: report }).then(report);
	};

	query();
	const unsubscribe = tui.onTerminalColorSchemeChange(query);

	return () => {
		stopped = true;
		unsubscribe();
	};
}
