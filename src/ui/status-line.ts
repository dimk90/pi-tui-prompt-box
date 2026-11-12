/**
 * Status line shown inside the prompt box.
 */

import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";

import type { RoutedModel } from "../routed-model.ts";

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
	/** Model a virtual `model` routed the latest response to; shown after `→`. */
	routedModel?: RoutedModel;
}

/**
 * Returns the theme color of the routed thinking level, or `undefined` when the status line shows no routed
 * level: without a routed model, without its level, or for a routed model without reasoning support.
 */
export function readRoutedLevelColor(
	theme: Theme,
	routedModel: RoutedModel | undefined,
): ((text: string) => string) | undefined {
	if (!routedModel?.model.reasoning || !routedModel.thinkingLevel)
		return undefined;

	return theme.getThinkingBorderColor(routedModel.thinkingLevel);
}

/**
 * Builds the status line text: model, provider and thinking level, then the routed model in the same format.
 * Like Pi's footer, the level shows only for models with reasoning support, and level `off` shows as `thinking off`.
 * In bash mode, `Bash` replaces them. Pi's busy indicator is added by the editor.
 */
export function formatStatus(options: StatusLineOptions): string {
	const { theme, levelColor, bashMode, model, thinkingLevel, routedModel } = options;
	if (bashMode === "context")
		return levelColor("Bash");

	if (bashMode === "no-context")
		return `${levelColor("Bash")}${theme.fg("dim", " (no context)")}`;

	if (!model)
		return theme.fg("dim", "no model");

	const selectedText = formatModel(options, model, thinkingLevel, levelColor);
	if (!routedModel)
		return selectedText;

	// The routed level has the color of its own level, which can differ from the accent bar
	const routedLevelColor = readRoutedLevelColor(theme, routedModel) ?? levelColor;
	const routedText = formatModel(options, routedModel.model, routedModel.thinkingLevel, routedLevelColor);

	return `${selectedText}${theme.fg("dim", "  →  ")}${routedText}`;
}

/**
 * Formats one model as `name provider · level`; the level is left out for models without reasoning support
 * and when it is unknown.
 */
function formatModel(
	options: StatusLineOptions,
	model: NonNullable<ExtensionContext["model"]>,
	thinkingLevel: string | undefined,
	levelColor: (text: string) => string,
): string {
	const { theme, getProviderName } = options;
	const modelText = `${theme.fg("text", model.name)} ${theme.fg("dim", getProviderName(model.provider))}`;
	if (!model.reasoning || !thinkingLevel)
		return modelText;

	const separator = theme.fg("dim", " · ");
	const level = levelColor(thinkingLevel === "off" ? "thinking off" : thinkingLevel);

	return `${modelText}${separator}${level}`;
}
