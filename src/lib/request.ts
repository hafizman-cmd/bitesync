import { errors, isErrorCode, type ErrorCode } from "./errors";

export class RequestError extends Error {
  constructor(public code: ErrorCode, public status: number) {
    super(errors[code].en);
  }
}

export async function requestJson<T>(url: string, data?: object): Promise<T> {
  const response = await fetch(url, data ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(15000),
  } : { cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new RequestError(isErrorCode(body?.code) ? body.code : "serverError", response.status);
  }
  return response.json() as Promise<T>;
}

export function requestErrorCode(error: unknown): ErrorCode {
  return error instanceof RequestError ? error.code : "networkError";
}
