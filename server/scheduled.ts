import { timingSafeEqual } from "node:crypto";

export type CronIdentity = {
  isCron?: boolean;
  taskUid?: string | null;
};

export function isAuthorizedScannerCron(user: CronIdentity) {
  return user.isCron === true && Boolean(user.taskUid);
}

export function isExternalScannerTriggerAuthorized(provided: string | string[] | undefined, expected: string) {
  if (!expected || typeof provided !== "string") return false;
  const providedBuffer = Buffer.from(provided, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export function isCronAuthenticationFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /session cookie|unauthorized|authentication/i.test(message);
}
