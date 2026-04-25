export type PermissionMap = Record<string, string | boolean | null | undefined>;

const permissionAliasMap: Record<string, string[]> = {
  "fiscal_year.read": ["finance_settings.read"],
  "fiscal_year.write": ["finance_settings.update"],
};

function isGrantedScope(value: string | boolean | null | undefined): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return false;
}

export function hasPermissionCode(
  permissions: PermissionMap,
  permissionCode: string,
): boolean {
  const code = permissionCode.trim();
  if (!code) return true;

  if (Object.prototype.hasOwnProperty.call(permissions, code)) {
    return isGrantedScope(permissions[code]);
  }

  const [module] = code.split(".");
  const wildcard = `${module}.*`;
  if (Object.prototype.hasOwnProperty.call(permissions, wildcard)) {
    return isGrantedScope(permissions[wildcard]);
  }

  const aliases = permissionAliasMap[code] ?? [];
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(permissions, alias)) {
      return isGrantedScope(permissions[alias]);
    }
  }

  return false;
}

export function hasAnyPermission(
  permissions: PermissionMap,
  permissionCodes: readonly string[],
): boolean {
  return permissionCodes.some((code) => hasPermissionCode(permissions, code));
}
