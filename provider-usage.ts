import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type {
  ProviderUsage,
  ProviderUsageResult,
  ProviderUsageWindow,
} from "@get-bb/plugin-sdk/provider-bridge";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const USAGE_TIMEOUT_MS = 10_000;
const ACCOUNT_FILE = path.join(
  os.homedir(),
  ".gemini",
  "google_accounts.json",
);
const emailSchema = z.string().email();
const AGY_FALLBACK_PATHS = [
  path.join(os.homedir(), ".local", "bin", "agy"),
  "/usr/local/bin/agy",
  "/opt/homebrew/bin/agy",
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function stringValue(
  record: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function remainingFraction(record: Record<string, unknown>): number | null {
  const value = record.remaining_fraction ?? record.remainingFraction;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    return null;
  }
  return value;
}

function normalizedResetTime(record: Record<string, unknown>): string | null {
  const value = stringValue(
    record,
    "reset_time",
    "resetTime",
    "resetsAt",
    "reset_at",
  );
  if (value === null) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function groupLabel(name: string): string {
  if (/gemini/iu.test(name)) return "Gemini";
  if (/claude|gpt/iu.test(name)) return "Claude/GPT";
  return name.trim() || "Models";
}

function windowLabel(record: Record<string, unknown>): string {
  const value =
    stringValue(record, "window", "label", "name", "period") ?? "limit";
  if (/week/iu.test(value)) return "Weekly limit";
  if (/5\s*-?\s*hour|five\s+hour|5h/iu.test(value)) return "5-hour limit";
  return value.replace(/\s+remaining$/iu, "");
}

function normalizeWindow(
  value: unknown,
  prefix: string,
): ProviderUsageWindow | null {
  const record = asRecord(value);
  if (record === null) return null;
  const fraction = remainingFraction(record);
  if (fraction === null) return null;
  return {
    label: `${prefix}: ${windowLabel(record)}`,
    usedPercent: Math.round((1 - fraction) * 1_000) / 10,
    resetsAt: normalizedResetTime(record),
  };
}

export function normalizeAntigravityUsage(
  output: unknown,
  accountEmail: string | null = null,
): ProviderUsage {
  const root = asRecord(output);
  if (root === null) {
    throw new TypeError("Antigravity usage response was not an object.");
  }
  const status = stringValue(root, "status");
  if (status !== null && status.toUpperCase() !== "SUCCESS") {
    throw new TypeError("Antigravity usage command did not succeed.");
  }
  const commandData = asRecord(asRecord(root.command)?.data);
  const groups = Array.isArray(root.groups)
    ? root.groups
    : Array.isArray(root.quota_groups)
      ? root.quota_groups
      : Array.isArray(root.quotaGroups)
        ? root.quotaGroups
        : Array.isArray(commandData?.groups)
          ? commandData.groups
          : [];
  const windows: ProviderUsageWindow[] = [];
  for (const groupValue of groups) {
    const group = asRecord(groupValue);
    if (group === null) continue;
    const prefix = groupLabel(
      stringValue(group, "name", "label", "group") ?? "",
    );
    const buckets = Array.isArray(group.buckets)
      ? group.buckets
      : Array.isArray(group.windows)
        ? group.windows
        : Array.isArray(group.limits)
          ? group.limits
          : Array.isArray(group.quotas)
            ? group.quotas
            : [];
    for (const bucket of buckets) {
      const normalized = normalizeWindow(bucket, prefix);
      if (normalized !== null) windows.push(normalized);
    }
  }
  if (windows.length === 0) {
    throw new TypeError("Antigravity usage response contained no quota windows.");
  }
  return {
    status: "ok",
    accountEmail,
    planLabel: stringValue(root, "plan", "planLabel", "current_tier"),
    windows,
  };
}

async function activeAccountEmail(): Promise<string | null> {
  try {
    const root = asRecord(JSON.parse(await readFile(ACCOUNT_FILE, "utf8")));
    const active = root?.active;
    const activeRecord = asRecord(active);
    const candidate =
      typeof active === "string"
        ? active
        : activeRecord === null
          ? null
          : stringValue(activeRecord, "email");
    const parsed = emailSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function resolveAgyExecutable(): Promise<string | null> {
  const pathCandidates = (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .map((directory) => path.join(directory, "agy"));
  for (const candidate of [...pathCandidates, ...AGY_FALLBACK_PATHS]) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue through PATH and the standard per-user package locations.
    }
  }
  return null;
}

async function executeUsageCommand(executable: string): Promise<unknown> {
  const { stdout } = await execFileAsync(
    executable,
    ["-p", "/usage", "--output-format", "json"],
    {
      encoding: "utf8",
      timeout: USAGE_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    },
  );
  return JSON.parse(stdout);
}

export async function getAntigravityProviderUsage(): Promise<ProviderUsageResult> {
  const accountEmail = await activeAccountEmail();
  const executable = await resolveAgyExecutable();
  if (executable === null) {
    return {
      supported: true,
      usage: {
        status: "error",
        message:
          "Antigravity usage could not be loaded because the `agy` CLI is not installed on this machine.",
        planLabel: null,
        accountEmail,
      },
    };
  }
  try {
    return {
      supported: true,
      usage: normalizeAntigravityUsage(
        await executeUsageCommand(executable),
        accountEmail,
      ),
    };
  } catch {
    return {
      supported: true,
      usage: {
        status: "error",
        message:
          "Antigravity usage could not be loaded. Run `agy -p /usage --output-format json` on this machine to verify its sign-in.",
        planLabel: null,
        accountEmail,
      },
    };
  }
}
