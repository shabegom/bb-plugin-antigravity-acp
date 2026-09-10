import assert from "node:assert/strict";
import test from "node:test";
import { effectiveLaunchArgs } from "../launch-spec.js";

test("preserves the uid argument on Linux", () => {
  assert.deepEqual(effectiveLaunchArgs(["--uid="], "linux"), ["--uid="]);
});

test("removes the Linux-only uid argument on macOS and Windows", () => {
  assert.deepEqual(effectiveLaunchArgs(["--uid="], "darwin"), []);
  assert.deepEqual(effectiveLaunchArgs(["--uid="], "win32"), []);
});

test("preserves unrelated launch arguments", () => {
  assert.deepEqual(
    effectiveLaunchArgs(["--uid=", "--verbose"], "darwin"),
    ["--verbose"],
  );
});
