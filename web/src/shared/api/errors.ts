import { API_MESSAGES, BUSINESS_ERROR_MESSAGES } from './messages.es';

/**
 * Turns whatever a Supabase call throws into one shape the UI can show.
 * Business rules fail in Postgres with SQLSTATE P0001, the code as MESSAGE
 * and a JSON DETAIL (CLAUDE.md, RPC checklist).
 */
export type AppErrorKind = 'business' | 'network' | 'auth' | 'unknown';

export class AppError extends Error {
  readonly kind: AppErrorKind;
  /** Business error code (snake_case) when kind is 'business'. */
  readonly code: string | null;
  readonly detail: Record<string, unknown>;

  /** `message` is the Spanish text that says what to do. */
  constructor(
    kind: AppErrorKind,
    message: string,
    code: string | null = null,
    detail: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.kind = kind;
    this.code = code;
    this.detail = detail;
  }
}

const NETWORK_HINTS = ['failed to fetch', 'networkerror', 'load failed', 'network request failed'];
const AUTH_CODES = new Set(['PGRST301', 'PGRST303', '401']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseDetail(details: unknown): Record<string, unknown> {
  if (typeof details !== 'string' || details === '') return {};
  try {
    const parsed: unknown = JSON.parse(details);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const record = isRecord(error) ? error : {};
  const code = typeof record.code === 'string' ? record.code : '';
  const rawMessage =
    typeof record.message === 'string'
      ? record.message
      : error instanceof Error
        ? error.message
        : '';

  if (code === 'P0001' && rawMessage !== '') {
    const detail = parseDetail(record.details);
    const translate = BUSINESS_ERROR_MESSAGES[rawMessage];
    const message = translate ? translate(detail) : API_MESSAGES.saveFailed;
    return new AppError('business', message, rawMessage, detail);
  }

  if (AUTH_CODES.has(code) || /jwt expired/i.test(rawMessage)) {
    return new AppError('auth', API_MESSAGES.sessionExpired);
  }

  const lower = rawMessage.toLowerCase();
  if (error instanceof TypeError || NETWORK_HINTS.some((hint) => lower.includes(hint))) {
    return new AppError('network', API_MESSAGES.saveFailed);
  }

  return new AppError('unknown', API_MESSAGES.saveFailed);
}
