/**
 * Override-only user configuration.
 *
 * Defaults live in this module; the global `<agent dir>/extensions/pi-tui-prompt-box.json` carries overrides
 * only and is never created by the extension. An absent file or omitted key is silent; an unreadable,
 * unparseable, or invalid file warns and falls back to the defaults.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getAgentDir } from "@earendil-works/pi-coding-agent";

/** Global override file; project-local configuration is not supported. */
export const CONFIG_FILE_NAME = "pi-tui-prompt-box.json";

/**
 * Options of the extension.
 */
export interface PromptBoxConfig {
	/** Draw user messages in the chat as prompt boxes and hide Pi's thinking level status; see doc/ui.md. */
	userMessageBoxes: boolean;
}

/**
 * A loaded configuration with the problems found in its file.
 */
export interface ConfigLoadResult {
	/** Defaults with every valid override applied. */
	config: PromptBoxConfig;
	/** One message per problem, ready to show to the user. */
	warnings: string[];
}

/** Configuration used when no override file exists. */
export const DEFAULT_CONFIG: Readonly<PromptBoxConfig> = { userMessageBoxes: true };

/**
 * Returns the absolute path of the global override file.
 */
export function getConfigFilePath(): string {
	return join(getAgentDir(), "extensions", CONFIG_FILE_NAME);
}

/**
 * Reads and validates the override file at `filePath`. A missing file yields the defaults without warnings;
 * an invalid or unknown key warns and keeps the other keys.
 */
export function loadConfigFile(filePath: string): ConfigLoadResult {
	let text: string;
	try {
		text = readFileSync(filePath, "utf8");
	} catch (error) {
		// An absent file is the expected state for users who never configured anything
		if (isMissingFileError(error))
			return { config: { ...DEFAULT_CONFIG }, warnings: [] };

		return useDefaults(`Cannot read ${filePath}: ${describeError(error)}.`);
	}

	let overrides: unknown;
	try {
		overrides = JSON.parse(text);
	} catch (error) {
		return useDefaults(`Cannot parse ${filePath}: ${describeError(error)}.`);
	}

	if (typeof overrides !== "object" || overrides === null || Array.isArray(overrides))
		return useDefaults(`${filePath} must contain a JSON object.`);

	return applyOverrides(overrides, filePath);
}

/**
 * Applies the valid entries of `overrides` to the defaults, with a warning for every other entry.
 */
function applyOverrides(overrides: object, filePath: string): ConfigLoadResult {
	const config = { ...DEFAULT_CONFIG };
	const warnings: string[] = [];
	for (const [key, value] of Object.entries(overrides)) {
		if (key !== "userMessageBoxes")
			warnings.push(`Unknown key "${key}" in ${filePath}.`);
		else if (typeof value !== "boolean")
			warnings.push(`"${key}" in ${filePath} must be true or false.`);
		else
			config.userMessageBoxes = value;
	}

	return { config, warnings };
}

/**
 * Returns the defaults with `warning` as the only problem.
 */
function useDefaults(warning: string): ConfigLoadResult {
	return { config: { ...DEFAULT_CONFIG }, warnings: [warning] };
}

/**
 * Tells whether `error` is the file system error for a path that does not exist.
 */
function isMissingFileError(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

/**
 * Returns a short reason for an unknown thrown value.
 */
function describeError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
