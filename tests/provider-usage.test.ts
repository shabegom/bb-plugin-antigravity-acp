import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAntigravityUsage } from "../provider-usage.js";

test("maps host-local agy quota groups into Cambium usage windows", () => {
  assert.deepEqual(
    normalizeAntigravityUsage(
      {
        status: "SUCCESS",
        command: {
          name: "usage",
          data: {
            groups: [
              {
                name: "Gemini Models",
                buckets: [
                  {
                    name: "Weekly Limit Remaining",
                    window: "weekly",
                    remaining_fraction: 0.84,
                    reset_time: "2026-09-20T23:21:34Z",
                  },
                  {
                    name: "Five Hour Limit Remaining",
                    window: "5h",
                    remaining_fraction: 0.5,
                    reset_time: "2026-09-14T04:21:34Z",
                  },
                ],
              },
              {
                name: "Claude and GPT models",
                buckets: [
                  {
                    window: "weekly",
                    remaining_fraction: 1,
                    reset_time: "2026-09-20T23:21:34Z",
                  },
                ],
              },
            ],
          },
        },
      },
      "sam@example.com",
    ),
    {
      status: "ok",
      accountEmail: "sam@example.com",
      planLabel: null,
      windows: [
        {
          label: "Gemini: Weekly limit",
          usedPercent: 16,
          resetsAt: "2026-09-20T23:21:34.000Z",
        },
        {
          label: "Gemini: 5-hour limit",
          usedPercent: 50,
          resetsAt: "2026-09-14T04:21:34.000Z",
        },
        {
          label: "Claude/GPT: Weekly limit",
          usedPercent: 0,
          resetsAt: "2026-09-20T23:21:34.000Z",
        },
      ],
    },
  );
});

test("refuses malformed output instead of inventing zero usage", () => {
  assert.throws(
    () => normalizeAntigravityUsage({ status: "SUCCESS", command: {} }),
    /no quota windows/u,
  );
  assert.throws(
    () => normalizeAntigravityUsage({ status: "ERROR", groups: [] }),
    /did not succeed/u,
  );
});
