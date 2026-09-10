const LINUX_ONLY_UID_ARG = "--uid=";

export function effectiveLaunchArgs(
  args: readonly string[],
  platform: string,
): string[] {
  if (platform === "linux") return [...args];
  return args.filter((arg) => arg !== LINUX_ONLY_UID_ARG);
}
