import assert from "node:assert/strict";
import test from "node:test";
import { effectiveLaunchArgs, effectiveLaunchEnv } from "../launch-spec.js";

test("removes the unsupported uid argument on every host", () => {
  assert.deepEqual(effectiveLaunchArgs(["--uid="]), []);
});

test("preserves unrelated launch arguments", () => {
  assert.deepEqual(
    effectiveLaunchArgs(["--uid=", "--verbose"]),
    ["--verbose"],
  );
});

test("selects personal OAuth for Antigravity ACP sessions", () => {
  assert.deepEqual(effectiveLaunchEnv({}), {
    BB_ACP_AUTH_METHOD_ID: "oauth-personal",
  });
});

test("preserves configured model defaults in the launch environment", () => {
  assert.deepEqual(
    effectiveLaunchEnv({
      defaultModel: " gemini-3.8-flash ",
      defaultReasoningEffort: " high ",
    }),
    {
      BB_ACP_AUTH_METHOD_ID: "oauth-personal",
      BB_ANTIGRAVITY_DEFAULT_MODEL: "gemini-3.8-flash",
      BB_ANTIGRAVITY_DEFAULT_REASONING: "high",
    },
  );
});
