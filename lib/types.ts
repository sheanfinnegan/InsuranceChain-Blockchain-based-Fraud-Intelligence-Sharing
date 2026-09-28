export type Role = 'ANALYST' | 'CLAIM_STAFF' | 'OJK';
export type User = {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  passwordHash?: string;
};
export type Org = {
  id: string;
  name: string;
  mspId: string;
  license: string;
  status: string;
  joinedAt: string;
};
export type Evidence = {
  id: string;
  name: string;
  hash: string;
  size: number;
  mime: string;
  uploadedBy: string;
  createdAt: string;
};
export type Vote = {
  orgId: string;
  userId: string;
  decision: string;
  reason: string;
  implicit: boolean;
  at: string;
  txId: string;
};
export type Round = {
  id: string;
  stage: string;
  proposerOrgId: string;
  reason: string;
  status: string;
  participants: string[];
  threshold: number;
  votes: Vote[];
  evidence: Evidence[];
  createdAt: string;
};
export type Event = {
  id: string;
  action: string;
  orgId: string;
  userId: string;
  at: string;
  txId: string;
  detail: string;
};
export type FraudCase = {
  id: string;
  title: string;
  description: string;
  fraudType: string;
  amount: number;
  provinceId?: string;
  city?: string;
  status: string;
  orgId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  identifiers: { label: string; hash: string; masked: string; value?: string }[];
  evidence: Evidence[];
  rounds: Round[];
  events: Event[];
};
export type Registration = {
  id: string;
  organization: string;
  license: string;
  name: string;
  email: string;
  passwordHash?: string;
  reason: string;
  letter: Evidence;
  status: string;
  createdAt: string;
  reviewNote?: string;
  reviewedAt?: string;
};
export type AppState = {
  caseIdentifiers?: Record<string, { label: string; hash: string; value: string }[]>;
  users: User[];
  orgs: Org[];
  registrations: Registration[];
  sessions: { hash: string; userId: string; expires: number }[];
  files: Evidence[];
  audit: Event[];
};
export type Snapshot = {
  user: User;
  users: User[];
  orgs: Org[];
  registrations: Registration[];
  cases: FraudCase[];
  audit: Event[];
  network: { mode: string; channel: string; healthy: boolean; message: string };
};
