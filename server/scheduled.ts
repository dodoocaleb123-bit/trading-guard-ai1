export type CronIdentity = {
  isCron?: boolean;
  taskUid?: string | null;
};

export function isAuthorizedScannerCron(user: CronIdentity) {
  return user.isCron === true && Boolean(user.taskUid);
}
