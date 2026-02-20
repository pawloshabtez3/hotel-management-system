export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function maskEmail(email: string) {
  const [rawLocal, rawDomain] = email.split("@");
  if (!rawLocal || !rawDomain) {
    return email;
  }

  const local =
    rawLocal.length <= 2
      ? `${rawLocal[0] ?? ""}*`
      : `${rawLocal[0]}${"*".repeat(Math.max(rawLocal.length - 2, 1))}${rawLocal[rawLocal.length - 1]}`;

  return `${local}@${rawDomain}`;
}
