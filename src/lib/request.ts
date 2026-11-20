export class RequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
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
    throw new RequestError(body?.error ?? "Something went wrong. Try again.", response.status);
  }
  return response.json() as Promise<T>;
}

export function errorMessage(error: unknown) {
  return error instanceof RequestError ? error.message : "Couldn't reach BiteSync. Check your connection and try again.";
}
