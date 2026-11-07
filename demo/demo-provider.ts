/**
 * Demo provider extension: a fake `rubber-duck` provider with one reasoning
 * model, `quack-mini`, for demo recordings and manual testing. It never calls
 * a real model; replies come from `replies.ts` and stream like real ones.
 *
 * Usage: pi -e . -e ./demo/demo-provider.ts --model rubber-duck/quack-mini
 */
import { setTimeout as sleep } from "node:timers/promises";

import {
	type AssistantMessage,
	createFauxCore,
	fauxAssistantMessage,
	type FauxContentBlock,
	fauxText,
	fauxThinking,
	type SimpleStreamOptions,
	type TranscriptContext,
} from "@earendil-works/pi-ai";
import type { ExtensionAPI, ProviderModelConfig } from "@earendil-works/pi-coding-agent";

import { createReply } from "./replies.ts";

/** Provider id, used in `--model rubber-duck/quack-mini`. */
const DEMO_PROVIDER = "rubber-duck";

/** Provider name, shown in the status line. */
const DEMO_PROVIDER_NAME = "Rubber Duck";

/** Model id, used in `--model rubber-duck/quack-mini`. */
const DEMO_MODEL = "quack-mini";

const DEMO_API = "rubber-duck-demo";

/** Streaming speed: a default reply takes about 1–2 seconds. */
const TOKENS_PER_SECOND = 80;

const MODEL: ProviderModelConfig = {
	id: DEMO_MODEL,
	name: "Quack Mini",
	reasoning: true,
	// Pi offers `xhigh` and `max` only when the model maps them
	thinkingLevelMap: { xhigh: "xhigh", max: "max" },
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 128_000,
	maxTokens: 16_384,
};

/**
 * Registers the demo provider. Pi's faux provider core streams the replies in
 * chunks and handles aborts; each request queues one reply for itself.
 */
export default function demoProvider(pi: ExtensionAPI): void {
	const core = createFauxCore({ api: DEMO_API, provider: DEMO_PROVIDER, tokensPerSecond: TOKENS_PER_SECOND });

	pi.registerProvider(DEMO_PROVIDER, {
		name: DEMO_PROVIDER_NAME,
		baseUrl: "http://localhost:0",
		apiKey: "demo",
		api: DEMO_API,
		models: [MODEL],
		streamSimple: (model, context, options) => {
			core.appendResponses([respond]);
			return core.streamSimple(model, context, options);
		},
	});
}

/** Builds the assistant message for the last user prompt, after the reply's delay. */
async function respond(context: TranscriptContext, options: SimpleStreamOptions | undefined): Promise<AssistantMessage> {
	const reply = createReply(readLastPrompt(context), options?.reasoning);
	if (reply.delayMs > 0)
		await waitUnlessAborted(reply.delayMs, options?.signal);

	const content: FauxContentBlock[] = [];
	if (reply.thinking !== undefined)
		content.push(fauxThinking(reply.thinking));

	if (reply.error !== undefined)
		return fauxAssistantMessage(content, { stopReason: "error", errorMessage: reply.error });

	content.push(fauxText(reply.text));
	return fauxAssistantMessage(content);
}

/** Text of the last user message, or an empty string. */
function readLastPrompt(context: TranscriptContext): string {
	const message = context.messages.findLast((candidate) => candidate.role === "user");
	if (message === undefined)
		return "";

	if (typeof message.content === "string")
		return message.content;

	return message.content.map((block) => (block.type === "text" ? block.text : "")).join("\n");
}

/** Waits `delayMs`, or less when `signal` aborts; the faux core then reports the abort. */
async function waitUnlessAborted(delayMs: number, signal: AbortSignal | undefined): Promise<void> {
	try {
		await sleep(delayMs, undefined, { signal });
	} catch {
		// An abort rejects the wait; the stream checks the signal right after
	}
}
