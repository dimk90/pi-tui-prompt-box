/**
 * Fake replies of the demo provider: thinking text sized by the thinking
 * level, and a markdown answer that quotes the prompt. Keywords in the prompt
 * pick special replies for manual testing.
 */
import type { ThinkingLevel } from "@earendil-works/pi-ai";

/** Pause before a reply starts streaming when the prompt has the `slow` keyword. */
const SLOW_DELAY_MS = 5_000;

/** Error message of a reply when the prompt has the `error` keyword. */
const ERROR_MESSAGE = "The duck flew away (demo error)";

/** Number of answer sections when the prompt has the `long` keyword. */
const LONG_SECTION_COUNT = 20;

/** Longest prompt part quoted in the answer, in characters. */
const MAX_QUOTE_LENGTH = 60;

/** Number of thinking sentences per paragraph. */
const SENTENCES_PER_PARAGRAPH = 3;

/** Number of thinking sentences per level, so the level shows in the thinking length. */
const THINKING_SENTENCE_COUNTS = {
	minimal: 1,
	low: 2,
	medium: 4,
	high: 6,
	xhigh: 9,
	max: 12,
} satisfies Record<ThinkingLevel, number>;

/** Thinking sentences after the first one, which names the level. */
const THINKING_SENTENCES = [
	"Considering whether the user really needs this answer.",
	"Weighing 0 options. Consulting 0 sources.",
	"Listening carefully, as rubber ducks do.",
	"The bug is probably in the code the user did not show.",
	"Maybe the user finds it while explaining it to me.",
	"Checking the pond for prior art.",
	"Counting the tokens I am not spending: all of them.",
	"Confidence: high. Evidence: none.",
	"Preening feathers to look more reliable.",
	"Considering a second quack for emphasis.",
	"Decided: one quack is enough.",
];

/** One fake reply. */
export interface DemoReply {
	/** Thinking text; absent when thinking is off. */
	readonly thinking?: string;
	/** Answer text; empty when `error` is set. */
	readonly text: string;
	/** Pause before streaming starts, in milliseconds. */
	readonly delayMs: number;
	/** Provider error message that replaces the answer. */
	readonly error?: string;
}

/**
 * Builds the reply to `prompt`. Whole-word keywords in the prompt, in any
 * case, change it:
 *   long    many answer sections, to test scrolling
 *   slow    a pause before streaming, to watch the busy indicator
 *   error   a provider error instead of the answer
 * `level` is undefined when thinking is off.
 */
export function createReply(prompt: string, level: ThinkingLevel | undefined): DemoReply {
	const thinking = level === undefined ? undefined : createThinking(level);
	const delayMs = hasKeyword(prompt, "slow") ? SLOW_DELAY_MS : 0;
	if (hasKeyword(prompt, "error"))
		return { thinking, text: "", delayMs, error: ERROR_MESSAGE };

	const sectionCount = hasKeyword(prompt, "long") ? LONG_SECTION_COUNT : 1;
	return { thinking, text: createAnswer(prompt, sectionCount), delayMs };
}

/** Whether `prompt` has `keyword` as a whole word, in any case. */
function hasKeyword(prompt: string, keyword: string): boolean {
	return new RegExp(`\\b${keyword}\\b`, "i").test(prompt);
}

/** Thinking text that names the level, with more sentences for higher levels. */
function createThinking(level: ThinkingLevel): string {
	const sentenceCount = THINKING_SENTENCE_COUNTS[level];
	const sentences = [`Thinking at ${level} effort.`, ...THINKING_SENTENCES.slice(0, sentenceCount - 1)];

	const paragraphs: string[] = [];
	for (let start = 0; start < sentences.length; start += SENTENCES_PER_PARAGRAPH)
		paragraphs.push(sentences.slice(start, start + SENTENCES_PER_PARAGRAPH).join(" "));

	return paragraphs.join("\n\n");
}

/** Markdown answer that quotes the prompt, with `sectionCount` findings sections. */
function createAnswer(prompt: string, sectionCount: number): string {
	const sections: string[] = [];
	for (let index = 1; index <= sectionCount; index++)
		sections.push(createSection(sectionCount === 1 ? "Here is what I found" : `Finding ${index}`));

	return [
		`You said: *${quotePrompt(prompt)}*. Excellent point.`,
		...sections,
		"Try explaining the problem to me again. That usually fixes it.",
	].join("\n\n");
}

/** One findings section: a list and a code block under `title`. */
function createSection(title: string): string {
	return [
		`${title}:`,
		"",
		"- **Cost:** 0 tokens",
		"- **Sources:** the pond",
		"- **Confidence:** unreasonably high",
		"",
		"```ts",
		"const answer = \"quack\";",
		"```",
	].join("\n");
}

/** The prompt on one line, cut to `MAX_QUOTE_LENGTH` characters. */
function quotePrompt(prompt: string): string {
	const line = prompt.replace(/\s+/g, " ").trim();
	if (line.length === 0)
		return "nothing";

	return line.length > MAX_QUOTE_LENGTH ? `${line.slice(0, MAX_QUOTE_LENGTH - 1)}…` : line;
}
