/**
 * Prompt box extension: replaces Pi's main editor with the boxed style from doc/ui.md.
 *
 * Usage: pi -e .
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { RgbColor, TUI } from "@earendil-works/pi-tui";

import { watchTerminalBackground } from "./terminal-background.ts";
import { computeBoxColors, type ReadBoxColors } from "./ui/colors.ts";
import { padPiContainers } from "./ui/padded-containers.ts";
import { findBuiltInFooter, PaddedFooter } from "./ui/padded-footer.ts";
import { PromptBoxEditor, type RenderStatus } from "./ui/prompt-box-editor.ts";
import { readScrollbarPadding } from "./ui/scrollbar-padding.ts";
import { formatStatus } from "./ui/status-line.ts";

/**
 * Registers the prompt box editor for every session.
 */
export default function promptBox(pi: ExtensionAPI): void {
	let restoreContainers: (() => void) | undefined;
	let stopWatchingBackground: (() => void) | undefined;

	pi.on("session_start", (_event, ctx) => {
		const renderStatus: RenderStatus = (barColor, bashMode) =>
			formatStatus({
				theme: ctx.ui.theme,
				levelColor: barColor,
				bashMode,
				model: ctx.model,
				getProviderName: (provider) => ctx.modelRegistry.getProviderDisplayName(provider),
				thinkingLevel: pi.getThinkingLevel(),
			});

		let terminalBackground: RgbColor | undefined;
		const readBoxColors: ReadBoxColors = () =>
			computeBoxColors(terminalBackground, ctx.ui.theme.appearance, ctx.ui.theme.getColorMode());

		let editorTui: TUI | undefined;
		let editor: PromptBoxEditor | undefined;
		ctx.ui.setEditorComponent((tui, theme, keybindings) => {
			editorTui = tui;
			const readRightPadding = () => readScrollbarPadding(tui);
			editor = new PromptBoxEditor(tui, theme, keybindings, renderStatus, readBoxColors, readRightPadding);
			return editor;
		});

		// Pi calls the editor factory synchronously, so both are set here in TUI mode only
		if (!editorTui || !editor)
			return;

		stopWatchingBackground = watchTerminalBackground(editorTui, (background) => {
			terminalBackground = background;
			editorTui?.requestRender();
		});

		restoreContainers = padPiContainers(editorTui, editor);

		// Search before setFooter(): it removes the current footer from the tree before calling the factory
		const builtInFooter = findBuiltInFooter(editorTui);
		if (!builtInFooter)
			return;

		const readModelState = () => ({ model: ctx.model, thinkingLevel: pi.getThinkingLevel() });
		ctx.ui.setFooter((tui) => new PaddedFooter(builtInFooter, readModelState, () => readScrollbarPadding(tui)));
	});

	pi.on("session_shutdown", (event) => {
		stopWatchingBackground?.();
		stopWatchingBackground = undefined;

		// Pi keeps its containers across extension reloads and session changes, so remove the padding for the
		// next extension instance; on quit it stays, as Pi may still print the transcript
		if (event.reason !== "quit")
			restoreContainers?.();

		restoreContainers = undefined;
	});
}
