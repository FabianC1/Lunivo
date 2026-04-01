export async function readApiError(response: Response, fallbackMessage: string) {
  try {
    const payload = await response.json();
    if (payload && typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
  } catch {
    // Ignore malformed bodies and fall back to the provided message.
  }

  return fallbackMessage;
}