/**
 * objToMap converts an object to a Map.
 */
export function objToMap(vals?: Record<string, string>): Map<string, string> | undefined {
  return vals ? new Map(Object.entries(vals)) : undefined;
}

/**
 * mapToObject converts a Map to an object.
 */
export function mapToObject(vals?: Map<string, string>): Record<string, string> | undefined {
  return vals ? Object.fromEntries(vals) : undefined;
}

/**
 * normalizeObject converts an object to a normalized object, aka Map
 * @param data
 * @returns objectwith string keys and values
 */
export function normalizeObject(data: unknown): Record<string, string> {
  if (
    Array.isArray(data) &&
    data.every(
      (item) =>
        Array.isArray(item) &&
        item.length === 2 &&
        typeof item[0] === 'string' &&
        typeof item[1] === 'string',
    )
  ) {
    // Convert from Array<[string, string]> to Object
    return Object.fromEntries(data);
  } else if (typeof data === 'object' && data !== null) {
    // Already in correct format, return as-is
    return data as Record<string, string>;
  }

  // If it's neither, return an empty object (or handle error)
  return {};
}
