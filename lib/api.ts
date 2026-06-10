import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getAuthToken } from './technicianSession';

const DEFAULT_PORT = process.env.EXPO_PUBLIC_API_PORT ?? '5003';

function resolveDevHost(): string | undefined {
  const envHost = process.env.EXPO_PUBLIC_API_HOST?.trim();
  if (envHost) return envHost;

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.linkingUri;
  if (hostUri?.includes(':')) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }
  return undefined;
}

function getBaseUrl(): string {
  if (Platform.OS === 'web') {
    return `http://localhost:${DEFAULT_PORT}/api`;
  }

  const host = resolveDevHost();
  if (host) {
    return `http://${host}:${DEFAULT_PORT}/api`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_PORT}/api`;
  }
  return `http://localhost:${DEFAULT_PORT}/api`;
}

export const API_URL = getBaseUrl();

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error: string };

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const token = getAuthToken();

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      `Cannot reach server at ${API_URL}. Check backend is running and EXPO_PUBLIC_API_HOST if on a device.`
    );
  }

  let body: ApiSuccess<T> | ApiFailure;
  try {
    body = (await response.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    throw new ApiError(`Request failed (${response.status})`, response.status);
  }

  if (!response.ok || !('ok' in body) || body.ok === false) {
    const message =
      'error' in body && body.error
        ? body.error
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return body.data;
}

