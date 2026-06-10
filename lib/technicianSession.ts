// Dev session — populated by POST /api/auth/login. Replace with real auth later.
export type TechnicianSession = {
  token: string;
  technicianId: string;
  name: string;
  email: string;
};

let session: TechnicianSession | null = null;

export function getTechnicianSession(): TechnicianSession | null {
  return session;
}

export function setTechnicianSession(next: TechnicianSession | null): void {
  session = next;
}

export function clearTechnicianSession(): void {
  session = null;
}

export function getTechnicianId(): string {
  return session?.technicianId ?? 'T001';
}

export function getAuthToken(): string | undefined {
  return session?.token;
}

/** @deprecated use setTechnicianSession after login */
export function setTechnicianId(id: string): void {
  if (session) {
    session = { ...session, technicianId: id.trim() || 'T001' };
  }
}
