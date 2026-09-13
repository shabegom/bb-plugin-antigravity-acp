import assert from "node:assert/strict";
import test from "node:test";
import { effectiveLaunchArgs } from "../launch-spec.js";

test("removes the unsupported uid argument on every host", () => {
  assert.deepEqual(effectiveLaunchArgs(["--uid="]), []);
});

test("preserves unrelated launch arguments", () => {
  assert.deepEqual(
    effectiveLaunchArgs(["--uid=", "--verbose"]),
    ["--verbose"],
  );
});
