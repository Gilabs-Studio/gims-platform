/// Safe double parser for API JSON values.
double asDouble(Object? value, {double fallback = 0}) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? fallback;
  return fallback;
}

/// Nullable variant of [asDouble].
double? nullableDouble(Object? value) {
  if (value == null) return null;
  return asDouble(value);
}
