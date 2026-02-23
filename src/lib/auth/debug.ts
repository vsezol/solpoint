type AuthDebugPayload = Record<string, unknown>;

function isAuthDebugEnabled(): boolean {
  if (process.env.AUTH_DEBUG_LOGS === "true") {
    return true;
  }

  return process.env.NODE_ENV !== "production";
}

export function authDebugLog(
  scope: string,
  event: string,
  payload?: AuthDebugPayload
) {
  if (!isAuthDebugEnabled()) {
    return;
  }

  if (payload) {
    console.info(`[auth-debug:${scope}] ${event}`, payload);
    return;
  }

  console.info(`[auth-debug:${scope}] ${event}`);
}

