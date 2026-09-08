import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FOCUSABLE_SELECTOR, nextFocusTarget } from "../src/focus.js";

const els = ["close", "input", "select", "apply"];

describe("nextFocusTarget", () => {
  it("advances through the dialog in order", () => {
    assert.equal(nextFocusTarget(els, "close"), "input");
    assert.equal(nextFocusTarget(els, "input"), "select");
    assert.equal(nextFocusTarget(els, "select"), "apply");
  });

  it("wraps from the last element back to the first", () => {
    // This is the whole point: Tab from the last control used to leave the
    // dialog and land on the page behind it.
    assert.equal(nextFocusTarget(els, "apply"), "close");
  });

  it("walks backwards for Shift+Tab and wraps at the start", () => {
    assert.equal(nextFocusTarget(els, "select", true), "input");
    assert.equal(nextFocusTarget(els, "close", true), "apply");
  });

  it("pulls focus back to an end when it is outside the dialog", () => {
    assert.equal(nextFocusTarget(els, "somewhere-else"), "close");
    assert.equal(nextFocusTarget(els, "somewhere-else", true), "apply");
    assert.equal(nextFocusTarget(els, null), "close");
  });

  it("stays put when the dialog has a single control", () => {
    assert.equal(nextFocusTarget(["only"], "only"), "only");
    assert.equal(nextFocusTarget(["only"], "only", true), "only");
  });

  it("returns null when there is nothing focusable", () => {
    assert.equal(nextFocusTarget([], "close"), null);
    assert.equal(nextFocusTarget(null, "close"), null);
    assert.equal(nextFocusTarget(undefined, "close"), null);
  });
});

describe("FOCUSABLE_SELECTOR", () => {
  it("covers the control types the dialogs actually contain", () => {
    for (const fragment of ["button", "input", "select", "textarea", "a[href]"]) {
      assert.ok(FOCUSABLE_SELECTOR.includes(fragment), fragment);
    }
  });

  it("excludes disabled controls and tabindex -1", () => {
    assert.ok(FOCUSABLE_SELECTOR.includes(":not([disabled])"));
    assert.ok(FOCUSABLE_SELECTOR.includes('[tabindex]:not([tabindex="-1"])'));
  });
});
