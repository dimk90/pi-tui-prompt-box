import assert from "node:assert/strict";
import { test } from "node:test";

import { computeBoxColors } from "../src/ui/colors.ts";

test("computeBoxColors makes the box lighter on dark terminals and darker on light ones", () => {
	assert.deepEqual(computeBoxColors({ r: 10, g: 10, b: 10 }, "dark", "truecolor"), {
		background: "\x1b[48;2;31;31;31m",
		halfBlock: "\x1b[38;2;31;31;31m",
	});
	assert.equal(computeBoxColors({ r: 255, g: 255, b: 255 }, "dark", "truecolor").background, "\x1b[48;2;232;232;232m");
});

test("computeBoxColors keeps the hue of the terminal background", () => {
	const { background } = computeBoxColors({ r: 0, g: 43, b: 54 }, "dark", "truecolor");
	const [red, green, blue] = (background.match(/\d+/g) ?? []).slice(2).map(Number);

	assert.ok(blue > green && green > red, background);
	assert.ok(blue > 54, "lighter than the terminal background");
});

test("computeBoxColors uses Pi's guess for the theme appearance without a reported background", () => {
	assert.deepEqual(
		computeBoxColors(undefined, "dark", "truecolor"),
		computeBoxColors({ r: 0, g: 0, b: 0 }, "dark", "truecolor"),
	);
	assert.deepEqual(
		computeBoxColors(undefined, "light", "truecolor"),
		computeBoxColors({ r: 255, g: 255, b: 255 }, "light", "truecolor"),
	);
});
