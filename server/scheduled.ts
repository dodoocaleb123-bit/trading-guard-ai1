export type CronIdentity = {
  isCron?: boolean;
  taskUid?: string | null;
};

export function isAuthorizedScannerCron(user: CronIdentity) {
  return user.isCron === true && Boolean(user.taskUid);
}

export function isCronAuthenticationFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /session cookie|unauthorized|authentication/i.test(message);
}
