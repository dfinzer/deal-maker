// Commitment scheme: hash(value || nonce) using SHA-256
// This ensures neither party can see the other's value until reveal,
// and neither can change their value after committing.

export async function createCommitment(
  value: number,
  nonce: string
): Promise<string> {
  const data = `${value}:${nonce}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function verifyCommitment(
  value: number,
  nonce: string,
  commitment: string
): Promise<boolean> {
  return createCommitment(value, nonce).then((c) => c === commitment);
}

export function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
