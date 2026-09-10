import { householdBootstrapResponseSchema, type HouseholdBootstrapResponse } from "@vocabflow/contracts";

export async function requestBootstrap(): Promise<HouseholdBootstrapResponse> {
  const response = await fetch("/api/bootstrap", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });

  if (!response.ok) throw new Error("BOOTSTRAP_REQUEST_FAILED");

  const payload: unknown = await response.json();
  const parsed = householdBootstrapResponseSchema.safeParse(payload);
  if (!parsed.success) throw new Error("BOOTSTRAP_RESPONSE_INVALID");
  return parsed.data;
}
