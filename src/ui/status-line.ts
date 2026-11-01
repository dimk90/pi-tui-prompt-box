/**
 * Status line shown inside the prompt box.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import { ACCENT_FG, BRIGHT_FG, DIM_FG } from "./colors.ts";

/**
 * Builds the status line: model, provider, thinking level and an optional busy indicator.
 */
export function formatStatus(
	model: ExtensionContext["model"],
	thinkingLevel: string,
	spinnerFrame: string | undefined,
): string {
	const modelText = model ? `${BRIGHT_FG}${model.name} ${DIM_FG}${model.provider}` : `${DIM_FG}no model`;
	const separator = `${DIM_FG} · `;
	const mode = `${ACCENT_FG}${capitalize(thinkingLevel)}`;
	const busy = spinnerFrame ? `${DIM_FG}  ${spinnerFrame} Working` : "";
	return `${modelText}${separator}${mode}${busy}`;
}

/**
 * Upper-cases the first letter, e.g. "medium" -> "Medium".
 */
function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
