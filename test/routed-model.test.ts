import assert from "node:assert/strict";
import { test } from "node:test";

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { findRoutedModel, type RoutedModelSource } from "../src/routed-model.ts";
import { createRuntime, MOCK_MODEL, MOCK_PROVIDER } from "./harness/runtime.ts";

type Model = NonNullable<ExtensionContext["model"]>;
type SessionEntry = NonNullable<ReturnType<RoutedModelSource["sessionManager"]["getLeafEntry"]>>;

const VIRTUAL_MODEL = { provider: "router", id: "auto", api: "pi-virtual" } as Model;
const PHYSICAL_MODEL = { provider: "provider", id: "model", api: "openai-completions" } as Model;

test("findRoutedModel matches the routed model of Pi's session", async (t) => {
	let context: ExtensionContext | undefined;
	const runtime = await createRuntime(t, {
		extensions: [(pi) => {
			pi.registerVirtualModel({
				provider: "router", id: "auto", name: "Auto",
				route: (_request, ctx) => {
					const model = ctx.modelRegistry.find(MOCK_PROVIDER, MOCK_MODEL);
					assert.ok(model);
					return { model, thinkingLevel: "off" };
				},
			});
			pi.on("session_start", (_event, ctx) => { context = ctx; });
		}],
	});
	const { session } = runtime;
	assert.ok(context);
	const ctx = context;

	const virtualModel = ctx.modelRegistry.find("router", "auto");
	assert.ok(virtualModel);
	await session.setModel(virtualModel);
	assert.equal(findRoutedModel(ctx), undefined, "no response yet");

	await session.prompt("Say one word: ok");
	assert.deepEqual(runtime.errors, []);

	const routedModel = findRoutedModel(ctx);
	assert.ok(session.routedModel);
	assert.deepEqual(routedModel, session.routedModel);
	assert.equal(routedModel?.model.id, MOCK_MODEL);

});

test("findRoutedModel returns nothing under a physical selection", () => {
	const source = createSource(PHYSICAL_MODEL, [createAssistantEntry("stop")]);
	assert.equal(findRoutedModel(source), undefined);
	assert.equal(findRoutedModel({ ...source, model: undefined }), undefined);
});

test("findRoutedModel skips failed and aborted responses and other entries", () => {
	const entries = [
		createAssistantEntry("stop", "high"),
		{ type: "message", message: { role: "user", content: "next" } },
		createAssistantEntry("error"),
		createAssistantEntry("aborted"),
	];

	assert.deepEqual(findRoutedModel(createSource(VIRTUAL_MODEL, entries)), { model: PHYSICAL_MODEL, thinkingLevel: "high" });
	assert.equal(findRoutedModel(createSource(VIRTUAL_MODEL, entries.slice(1))), undefined);
});

test("findRoutedModel returns nothing when the response model is not in the registry", () => {
	const source = createSource(VIRTUAL_MODEL, [createAssistantEntry("stop")]);
	assert.equal(findRoutedModel({ ...source, modelRegistry: { find: () => undefined } }), undefined);
});

/** An assistant message entry answered by `PHYSICAL_MODEL`; only the fields `findRoutedModel` reads are set. */
function createAssistantEntry(stopReason: string, thinkingLevel?: string): object {
	const { provider, id } = PHYSICAL_MODEL;
	return { type: "message", message: { role: "assistant", provider, model: id, stopReason, thinkingLevel } };
}

/** A source whose session branch holds `entries` from root to leaf, and whose registry knows `PHYSICAL_MODEL`. */
function createSource(model: Model, entries: object[]): RoutedModelSource {
	const branch = entries.map((entry, index) => ({
		...entry, id: String(index), parentId: index > 0 ? String(index - 1) : null,
	})) as unknown as SessionEntry[];

	return {
		model,
		sessionManager: {
			getLeafEntry: () => branch.at(-1),
			getEntry: (id) => branch.find((entry) => entry.id === id),
		},
		modelRegistry: {
			find: (provider, id) => (provider === PHYSICAL_MODEL.provider && id === PHYSICAL_MODEL.id ? PHYSICAL_MODEL : undefined),
		},
	};
}
