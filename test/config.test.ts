import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";

import { CONFIG_FILE_NAME, DEFAULT_CONFIG, loadConfigFile } from "../src/config.ts";

test("loadConfigFile returns the defaults silently when the file is missing", async (t) => {
	const directory = await createDirectory(t);

	assert.deepEqual(loadConfigFile(join(directory, CONFIG_FILE_NAME)), { config: DEFAULT_CONFIG, warnings: [] });
	assert.equal(DEFAULT_CONFIG.userMessageBoxes, true);
});

test("loadConfigFile applies the userMessageBoxes override", async (t) => {
	const filePath = await writeConfigFile(t, `{ "userMessageBoxes": false }`);

	assert.deepEqual(loadConfigFile(filePath), { config: { userMessageBoxes: false }, warnings: [] });
});

test("loadConfigFile warns about invalid and unknown keys and keeps the valid ones", async (t) => {
	const invalid = await writeConfigFile(t, `{ "userMessageBoxes": "no" }`);
	assert.deepEqual(loadConfigFile(invalid), {
		config: DEFAULT_CONFIG,
		warnings: [`"userMessageBoxes" in ${invalid} must be true or false.`],
	});

	const unknown = await writeConfigFile(t, `{ "userMessageBox": false, "userMessageBoxes": false }`);
	assert.deepEqual(loadConfigFile(unknown), {
		config: { userMessageBoxes: false },
		warnings: [`Unknown key "userMessageBox" in ${unknown}.`],
	});
});

test("loadConfigFile warns and returns the defaults for a file that is not a JSON object", async (t) => {
	const broken = await writeConfigFile(t, `{ "userMessageBoxes": `);
	const brokenResult = loadConfigFile(broken);
	assert.deepEqual(brokenResult.config, DEFAULT_CONFIG);
	assert.equal(brokenResult.warnings.length, 1);
	assert.ok(brokenResult.warnings[0].startsWith(`Cannot parse ${broken}: `));

	const list = await writeConfigFile(t, `[false]`);
	assert.deepEqual(loadConfigFile(list), {
		config: DEFAULT_CONFIG,
		warnings: [`${list} must contain a JSON object.`],
	});

	const directory = await createDirectory(t);
	const unreadableResult = loadConfigFile(directory);
	assert.deepEqual(unreadableResult.config, DEFAULT_CONFIG);
	assert.ok(unreadableResult.warnings[0].startsWith(`Cannot read ${directory}: `));
});

/**
 * Creates a temporary directory that is removed when the test ends.
 */
async function createDirectory(t: TestContext): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "pi-tui-prompt-box-config-"));
	t.after(() => rm(directory, { recursive: true, force: true }));

	return directory;
}

/**
 * Writes `text` as a config file in its own temporary directory and returns the file path.
 */
async function writeConfigFile(t: TestContext, text: string): Promise<string> {
	const filePath = join(await createDirectory(t), CONFIG_FILE_NAME);
	await writeFile(filePath, text);

	return filePath;
}
