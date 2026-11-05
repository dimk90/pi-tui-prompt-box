import assert from "node:assert/strict";
import { test } from "node:test";

import { Container, ScrollView } from "@earendil-works/pi-tui";

import { readScrollbarPadding } from "../src/ui/scrollbar-padding.ts";

test("readScrollbarPadding leaves a column in fullscreen mode with the auto scrollbar only", () => {
	const document = new Container();
	const tui = new Container();
	tui.addChild(document);
	assert.equal(readScrollbarPadding(tui), 0, "regular mode: no layout root");

	const scrollView = new ScrollView(document, { scrollbar: "auto" });
	const layoutRoot = new Container();
	layoutRoot.addChild(scrollView);
	Object.assign(tui, { layoutRoot });
	assert.equal(readScrollbarPadding(tui), 1, "auto");

	for (const scrollbar of ["always", "hidden"] as const) {
		scrollView.setScrollbar(scrollbar);
		assert.equal(readScrollbarPadding(tui), 0, scrollbar);
	}
});

test("readScrollbarPadding ignores scroll views of other components", () => {
	const tui = new Container();
	tui.addChild(new Container());
	const layoutRoot = new Container();
	layoutRoot.addChild(new ScrollView(new Container(), { scrollbar: "auto" }));
	Object.assign(tui, { layoutRoot });

	assert.equal(readScrollbarPadding(tui), 0);
});
