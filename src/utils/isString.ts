export function isString(
  str: string | undefined | (string | null)[]
): str is string {
  return !Array.isArray(str) && str !== undefined;
}
