/**
 * Routed model: the physical model a virtual model picked for the latest successful response.
 */

import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";

// API id of Pi's virtual models; Pi does not export its own constant
const VIRTUAL_MODEL_API = "pi-virtual";

/**
 * Physical model that answered, with the thinking level the router picked for it.
 */
export interface RoutedModel {
	model: NonNullable<ExtensionContext["model"]>;
	thinkingLevel?: Parameters<Theme["getThinkingBorderColor"]>[0];
}

/**
 * Parts of the extension context the routed model is read from.
 */
export interface RoutedModelSource {
	model: ExtensionContext["model"];
	sessionManager: Pick<ExtensionContext["sessionManager"], "getLeafEntry" | "getEntry">;
	modelRegistry: Pick<ExtensionContext["modelRegistry"], "find">;
}

/**
 * Finds the routed model of the latest successful response on the current session branch.
 *
 * Pi gives extensions no access to the `routedModel` of its session, so this follows the same rules:
 * only under a virtual selection, and failed or aborted responses are skipped. Returns `undefined`
 * without such a response, or when its model is no longer in the registry.
 */
export function findRoutedModel(source: RoutedModelSource): RoutedModel | undefined {
	const { model, sessionManager, modelRegistry } = source;
	if (model?.api !== VIRTUAL_MODEL_API)
		return undefined;

	// The answer is usually near the leaf, so walk up from it instead of building the whole branch
	let entry = sessionManager.getLeafEntry();
	while (entry) {
		if (entry.type === "message" && entry.message.role === "assistant") {
			const { stopReason, provider, model: modelId, thinkingLevel } = entry.message;
			if (stopReason !== "error" && stopReason !== "aborted") {
				const routedModel = modelRegistry.find(provider, modelId);
				if (!routedModel || routedModel.api === VIRTUAL_MODEL_API)
					return undefined;

				return { model: routedModel, thinkingLevel };
			}
		}

		entry = entry.parentId ? sessionManager.getEntry(entry.parentId) : undefined;
	}

	return undefined;
}
