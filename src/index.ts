/**
 * Prompt box extension: replaces Pi's main editor with the boxed style from doc/ui.md.
 *
 * Usage: pi -e .
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";

import { PromptBoxEditor } from "./ui/prompt-box-editor.ts";
import { formatStatus } from "./ui/status-line.ts";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL_MS = 80;

/**
 * Registers the prompt box editor for every session.
 */
export default function promptBox(pi: ExtensionAPI): void {
	let isWorking = false;
	let spinnerIndex = 0;
	let spinnerTimer: ReturnType<typeof setInterval> | undefined;
	let activeTui: TUI | undefined;

	function stopSpinner(): void {
		clearInterval(spinnerTimer);
		spinnerTimer = undefined;
	}

	pi.on("agent_start", () => {
		isWorking = true;
		stopSpinner();
		spinnerTimer = setInterval(() => {
			spinnerIndex = (spinnerIndex + 1) % SPINNER_FRAMES.length;
			activeTui?.requestRender();
		}, SPINNER_INTERVAL_MS);
		activeTui?.requestRender();
	});

	pi.on("agent_settled", () => {
		isWorking = false;
		stopSpinner();
		activeTui?.requestRender();
	});

	pi.on("session_shutdown", () => {
		stopSpinner();
		activeTui = undefined;
	});

	pi.on("session_start", (_event, ctx) => {
		// The box shows its own busy indicator in the status line
		ctx.ui.setWorkingVisible(false);

		const renderStatus = () => {
			const spinnerFrame = isWorking ? SPINNER_FRAMES[spinnerIndex] : undefined;
			return formatStatus(ctx.model, pi.getThinkingLevel(), spinnerFrame);
		};
		ctx.ui.setEditorComponent((tui, theme, keybindings) => {
			activeTui = tui;
			return new PromptBoxEditor(tui, theme, keybindings, renderStatus);
		});
	});
}
