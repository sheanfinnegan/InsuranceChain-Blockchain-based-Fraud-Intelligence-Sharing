import profile from '../config/fabric-network.json';
export function fabricConnection(
  mspId: string,
  env: Record<string, string | undefined> = process.env,
) {
  const config = profile.organizations[mspId as keyof typeof profile.organizations];
  if (!config) throw new Error('MSP tidak dikenal: ' + mspId);
  return {
    ...config,
    endpoint: env[`FABRIC_${config.org.toUpperCase()}_ENDPOINT`] || config.endpoint,
    channel: profile.channel,
    chaincode: profile.chaincode,
  };
}
// Evaluate on OJK's own ledger, never silently fall back to an insurer's peer.
// Writes retain channel endorsement discovery; endorsements are not business votes.
export const queryOrganizations = (mspId: string, write: boolean) =>
  mspId === 'OJKMSP' && !write ? ['OJKMSP'] : undefined;
