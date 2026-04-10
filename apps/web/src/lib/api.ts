export type ApiErrorShape = {
  message: string;
  code?: string;
  field_errors?: Record<string, string>;
  gate_errors?: Array<{
    gate: 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
    passed: false;
    message: string;
  }>;
  passed_gate_count?: number | null;
  conflict_type?: string;
  planned_trade_id?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string>;
  gateErrors?: Array<{
    gate: 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
    passed: false;
    message: string;
  }>;
  passedGateCount?: number | null;
  conflictType?: string;
  plannedTradeId?: string;

  constructor(status: number, body: ApiErrorShape) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.fieldErrors = body.field_errors;
    this.gateErrors = body.gate_errors;
    this.passedGateCount = body.passed_gate_count;
    this.conflictType = body.conflict_type;
    this.plannedTradeId = body.planned_trade_id;
  }
}

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000';
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

function buildApiUrl(path: string) {
  const normalizedBase = API_ORIGIN.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const dedupedPath = normalizedBase.endsWith('/api')
    ? normalizedPath.replace(/^\/api(?=\/|$)/, '')
    : normalizedPath;

  return `${normalizedBase}${dedupedPath}`;
}

function readCookie(name: string) {
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

async function ensureCsrfCookie() {
  if (typeof document === 'undefined' || readCookie(CSRF_COOKIE_NAME)) {
    return;
  }

  await fetch(buildApiUrl('/api/auth/me'), {
    credentials: 'include',
  });
}

export async function apiFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    headers?: HeadersInit;
  } = {},
) {
  const method = options.method ?? 'GET';

  if (method !== 'GET') {
    await ensureCsrfCookie();
  }

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (method !== 'GET') {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);

    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  const response = await fetch(buildApiUrl(path), {
    method,
    credentials: 'include',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let payload: T | ApiErrorShape | null = null;

  try {
    payload = (await response.json()) as T | ApiErrorShape;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (payload as ApiErrorShape | null) ?? { message: 'Unable to complete the request right now.' },
    );
  }

  return payload as T;
}
