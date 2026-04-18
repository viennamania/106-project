export function jsonAutomationError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function assertAutomationInternalAccess(request: Request) {
  const configuredKey = process.env.CONTENT_AUTOMATION_INTERNAL_KEY?.trim();

  if (!configuredKey) {
    throw new Error("CONTENT_AUTOMATION_INTERNAL_KEY is not configured.");
  }

  const requestKey = request.headers.get("x-automation-key")?.trim();

  if (!requestKey || requestKey !== configuredKey) {
    throw new Error("Unauthorized automation request.");
  }
}
