import { errors, isErrorCode, type ErrorCode } from "./errors";

export class RequestError extends Error {
  constructor(public code: ErrorCode, public status: number) {
    super(errors[code].en);
  }
}

export async function requestJson<T>(url: string, data?: object, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(data ? 15000 : 12000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const response = await fetch(url, data ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal: requestSignal,
  } : { cache: "no-store", signal: requestSignal });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new RequestError(isErrorCode(body?.code) ? body.code : "serverError", response.status);
  }
  return response.json() as Promise<T>;
}

export function requestErrorCode(error: unknown): ErrorCode {
  return error instanceof RequestError ? error.code : "networkError";
}
