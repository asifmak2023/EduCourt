import type { MessageKey } from "@eis/i18n";

type Translate = (key: MessageKey) => string;

export function roleKey(role: string): MessageKey {
  const camel = role.replace(/_([a-z])/g, (_, char: string) =>
    char.toUpperCase()
  );

  return `role.${camel}` as MessageKey;
}

export function roleLabel(role: string, t: Translate): string {
  const key = roleKey(role);
  const label = t(key);

  return label === key ? role.replace(/_/g, " ") : label;
}

export function roleSummary(
  roles: string[],
  t: Translate,
  limit = 2
): string {
  return roles
    .slice(0, limit)
    .map((role) => roleLabel(role, t))
    .join(" / ");
}
