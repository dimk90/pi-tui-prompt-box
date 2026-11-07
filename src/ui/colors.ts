/**
 * ANSI color codes of the box background, shared by the prompt box components; see doc/ui.md.
 */

import type { ThemeAppearance } from "@earendil-works/pi-coding-agent";
import {
	backgroundAnsi,
	type Color,
	colorToOkhsl,
	foregroundAnsi,
	okhslColor,
	type RgbColor,
	rgbColor,
	type TerminalColorMode,
} from "@earendil-works/pi-tui";

export const RESET = "\x1b[0m";

// OKHSL lightness between the terminal background and the box background; a #0a0a0a terminal gets a #1f1f1f box
const BOX_LIGHTNESS_SHIFT = 0.08;
// Backgrounds above this OKHSL lightness count as light, so the box gets darker instead of lighter
const LIGHT_BACKGROUND_LIGHTNESS = 0.5;
// Pi's guesses for the terminal background when the terminal does not report it
const GUESSED_BACKGROUNDS = {
	dark: rgbColor(0, 0, 0),
	light: rgbColor(255, 255, 255),
} satisfies Record<ThemeAppearance, Color>;

/**
 * ANSI codes that draw the box background.
 */
export interface BoxColors {
	/** Background code for the full box rows. */
	background: string;
	/** Foreground code for the half blocks of the bottom edge, drawn on the terminal background. */
	halfBlock: string;
}

/**
 * Function that returns the current box colors; called on every render.
 */
export type ReadBoxColors = () => BoxColors;

/**
 * Computes the box colors from the terminal background: the same hue and saturation, with the OKHSL
 * lightness moved by `BOX_LIGHTNESS_SHIFT` toward the middle, so the box is lighter on dark terminals and
 * darker on light ones. Without a reported background, Pi's guess for the theme `appearance` is used.
 */
export function computeBoxColors(
	terminalBackground: RgbColor | undefined,
	appearance: ThemeAppearance,
	mode: TerminalColorMode,
): BoxColors {
	const background = terminalBackground
		? rgbColor(terminalBackground.r, terminalBackground.g, terminalBackground.b)
		: GUESSED_BACKGROUNDS[appearance];
	const { h, s, l } = colorToOkhsl(background);
	const shift = l > LIGHT_BACKGROUND_LIGHTNESS ? -BOX_LIGHTNESS_SHIFT : BOX_LIGHTNESS_SHIFT;
	const boxColor = okhslColor(h, s, l + shift);

	return { background: backgroundAnsi(boxColor, mode), halfBlock: foregroundAnsi(boxColor, mode) };
}
