const UNSUPPORTED_UID_ARG = "--uid=";
const DEFAULT_AUTH_METHOD_ID = "oauth-personal";

export function effectiveLaunchArgs(args: readonly string[]): string[] {
  return args.filter((arg) => arg !== UNSUPPORTED_UID_ARG);
}

export function withAntigravityAuth(
  env: Readonly<Record<string, string>> = {},
): Record<string, string> {
  return {
    BB_ACP_AUTH_METHOD_ID: DEFAULT_AUTH_METHOD_ID,
    ...env,
  };
}

export function effectiveLaunchEnv(options: {
  defaultModel?: string;
  defaultReasoningEffort?: string;
}): Record<string, string> {
  const env: Record<string, string> = withAntigravityAuth({
    // Antigravity advertises several non-standard ACP auth ids. Naming the
    // personal OAuth method makes Cambium authenticate before session/new.
  });
  if (options.defaultModel?.trim()) {
    env.BB_ANTIGRAVITY_DEFAULT_MODEL = options.defaultModel.trim();
  }
  if (options.defaultReasoningEffort?.trim()) {
    env.BB_ANTIGRAVITY_DEFAULT_REASONING = options.defaultReasoningEffort.trim();
  }
  return env;
}
