import { apiRequest } from './api';
import { setTechnicianSession, type TechnicianSession } from './technicianSession';

type LoginResponse = {
  token: string;
  technicianId: string;
  name: string;
  email: string;
};

export async function login(email: string, password: string): Promise<TechnicianSession> {
  const data = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const session: TechnicianSession = {
    token: data.token,
    technicianId: data.technicianId,
    name: data.name,
    email: data.email,
  };

  setTechnicianSession(session);
  return session;
}
