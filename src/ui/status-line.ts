/**
 * Status line shown inside the prompt box.
 */

import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";

/**
 * Current state shown in the status line, with the colors to draw it.
 */
export interface StatusLineOptions {
	theme: Theme;
	/** Colors the thinking level or `Bash`; the editor `borderColor`, so it matches the accent bar. */
	levelColor: (text: string) => string;
	/** Input starts with `!`: Pi runs it as a shell command, not a model prompt. */
	isBashMode: boolean;
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
	const { theme, levelColor, isBashMode, model, thinkingLevel, spinnerFrame } = options;
	const busy = spinnerFrame ? theme.fg("dim", `  ${spinnerFrame} Working`) : "";
	if (isBashMode) return `${levelColor("Bash")}${busy}`;

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
