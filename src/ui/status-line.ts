/**
 * Status line shown inside the prompt box.
 */

import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";

/**
 * Bash mode of the input:
 *   off          a normal prompt
 *   context      `!` runs a shell command; its output goes to the model context
 *   no-context   `!!` runs a shell command; its output stays out of the context
 */
export type BashMode = "off" | "context" | "no-context";

/**
 * Current state shown in the status line, with the colors to draw it.
 */
export interface StatusLineOptions {
	theme: Theme;
	/** Colors the thinking level or `Bash`; the editor `borderColor`, so it matches the accent bar. */
	levelColor: (text: string) => string;
	bashMode: BashMode;
	model: ExtensionContext["model"];
	/** Returns the display name of a provider id, like Pi's model registry: `opencode` → `OpenCode Zen`. */
	getProviderName: (provider: string) => string;
	thinkingLevel: string;
}

/**
 * Builds the status line text: model, provider and thinking level.
 * In bash mode, `Bash` replaces them. Pi's busy indicator is added by the editor.
 */
export function formatStatus(options: StatusLineOptions): string {
	const { theme, levelColor, bashMode, model, getProviderName, thinkingLevel } = options;
	if (bashMode === "context")
		return levelColor("Bash");

	if (bashMode === "no-context")
		return `${levelColor("Bash")}${theme.fg("dim", " (no context)")}`;

	const modelText = model
		? `${theme.fg("text", model.name)} ${theme.fg("dim", getProviderName(model.provider))}`
		: theme.fg("dim", "no model");
	const separator = theme.fg("dim", " · ");
	const level = levelColor(thinkingLevel);

	return `${modelText}${separator}${level}`;
}
