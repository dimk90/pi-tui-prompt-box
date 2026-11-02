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
	thinkingLevel: string;
	/** Spinner frame of the busy indicator; undefined when the agent is idle. */
	spinnerFrame: string | undefined;
}

/**
 * Builds the status line: model, provider, thinking level and an optional busy indicator.
 * In bash mode, `Bash` replaces the model, provider and thinking level.
 */
export function formatStatus(options: StatusLineOptions): string {
	const { theme, levelColor, bashMode, model, thinkingLevel, spinnerFrame } = options;
	const busy = spinnerFrame ? theme.fg("dim", `  ${spinnerFrame} Working`) : "";
	if (bashMode === "context") return `${levelColor("Bash")}${busy}`;
	if (bashMode === "no-context") return `${levelColor("Bash")}${theme.fg("dim", " (no context)")}${busy}`;

	const modelText = model
		? `${theme.fg("text", model.name)} ${theme.fg("dim", model.provider)}`
		: theme.fg("dim", "no model");
	const separator = theme.fg("dim", " · ");
	const level = levelColor(capitalize(thinkingLevel));
	return `${modelText}${separator}${level}${busy}`;
}

/**
 * Upper-cases the first letter, e.g. "medium" -> "Medium".
 */
function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
