export function canRenderInfrastructureRecoveryAction(
  isCentralSupportAdmin: boolean | undefined,
  recovery: { eligible?: boolean } | null | undefined,
): boolean {
  return isCentralSupportAdmin === true && recovery?.eligible === true;
}
