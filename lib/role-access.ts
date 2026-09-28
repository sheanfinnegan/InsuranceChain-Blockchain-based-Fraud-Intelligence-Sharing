import type { Role, FraudCase } from './types';
export const canReadCase = (role: Role, c: Pick<FraudCase, 'status'>) =>
  role !== 'CLAIM_STAFF' || ['APPROVED', 'INVALID'].includes(c.status);
export const canReadBlockchain = (role: Role) => role === 'OJK';
export function portalView(portal: string, view: string) {
  const allowed =
    portal === 'staff'
      ? ['dashboard', 'search', 'settings']
      : portal === 'ojk'
        ? [
            'dashboard',
            'voting',
            'history',
            'organizations',
            'registrations',
            'blockchain',
            'settings',
          ]
        : ['dashboard', 'search', 'voting', 'history', 'staff', 'settings'];
  return allowed.includes(view)
    ? view
    : portal === 'ojk' && view === 'search'
      ? 'history'
      : 'dashboard';
}
