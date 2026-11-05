/**
 * Prompt box extension: replaces Pi's main editor with the boxed style from doc/ui.md.
 *
 * Usage: pi -e .
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";

import { padPiContainers } from "./ui/padded-containers.ts";
import { findBuiltInFooter, PaddedFooter } from "./ui/padded-footer.ts";
import { PromptBoxEditor, type RenderStatus } from "./ui/prompt-box-editor.ts";
import { formatStatus } from "./ui/status-line.ts";

/**
 * Registers the prompt box editor for every session.
 */
export default function promptBox(pi: ExtensionAPI): void {
	let restoreContainers: (() => void) | undefined;

	pi.on("session_start", (_event, ctx) => {
		const renderStatus: RenderStatus = (barColor, bashMode) =>
			formatStatus({
				theme: ctx.ui.theme,
				levelColor: barColor,
				bashMode,
				model: ctx.model,
				thinkingLevel: pi.getThinkingLevel(),
			});

		let editorTui: TUI | undefined;
		let editor: PromptBoxEditor | undefined;
		ctx.ui.setEditorComponent((tui, theme, keybindings) => {
			editorTui = tui;
			editor = new PromptBoxEditor(tui, theme, keybindings, renderStatus);
			return editor;
		});

		// Pi calls the editor factory synchronously, so both are set here in TUI mode only
		if (!editorTui || !editor)
			return;

		restoreContainers = padPiContainers(editorTui, editor);

		// Search before setFooter(): it removes the current footer from the tree before calling the factory
		const builtInFooter = findBuiltInFooter(editorTui);
		if (!builtInFooter)
			return;

		const readModelState = () => ({ model: ctx.model, thinkingLevel: pi.getThinkingLevel() });
		ctx.ui.setFooter(() => new PaddedFooter(builtInFooter, readModelState));
	});

	// Pi keeps its containers across extension reloads and session changes, so remove the padding for the next
	// extension instance; on quit it stays, as Pi may still print the transcript
	pi.on("session_shutdown", (event) => {
		if (event.reason !== "quit")
			restoreContainers?.();

		restoreContainers = undefined;
	});
}
