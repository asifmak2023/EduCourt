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

export const PORTAL_ROLES = new Set(["student", "parent_guardian"]);
export const RESTRICTED_ROLES = new Set(["platform_admin", "campus_admin"]);

export function formatAction(action: string): string {
  return action.replace(/_/g, " ");
}

export function formatModule(module: string, label?: string): string {
  if (label) {
    return label;
  }

  return module.replace(/_/g, " ");
}

export function combinedModules(
  roleValues: readonly string[],
  catalog: readonly { value: string; modules?: Record<string, string[]> }[]
): Record<string, string[]> {
  const merged: Record<string, Set<string>> = {};

  for (const value of roleValues) {
    const role = catalog.find((item) => item.value === value);
    if (!role?.modules) {
      continue;
    }

    for (const [module, actions] of Object.entries(role.modules)) {
      if (!merged[module]) {
        merged[module] = new Set();
      }
      for (const action of actions) {
        merged[module].add(action);
      }
    }
  }

  return Object.fromEntries(
    Object.entries(merged).map(([module, actions]) => [
      module,
      Array.from(actions),
    ])
  );
}

export function isPortalOnly(
  roles: readonly string[] | undefined | null
): boolean {
  if (!roles || roles.length === 0) {
    return false;
  }

  return roles.every((role) => PORTAL_ROLES.has(role));
}
