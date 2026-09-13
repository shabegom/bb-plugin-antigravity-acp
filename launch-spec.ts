const UNSUPPORTED_UID_ARG = "--uid=";

export function effectiveLaunchArgs(args: readonly string[]): string[] {
  return args.filter((arg) => arg !== UNSUPPORTED_UID_ARG);
}
