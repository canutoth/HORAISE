export function getAdminEmails(): string[] {
  const emails: string[] = [];
  const primary = process.env.EMAIL_ADMIN;
  const secondary = process.env.EMAIL_ADMIN_SECOND;
  if (primary) emails.push(primary);
  if (secondary) emails.push(secondary);
  return emails;
}

export function isAdminEmail(email: string): boolean {
  const target = email.toLowerCase().trim();
  return getAdminEmails().some((e) => e.toLowerCase().trim() === target);
}
