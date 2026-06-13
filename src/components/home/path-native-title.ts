const NATIVE_TITLE_MARKER = /^@native-title:([^@\n]+)@\n?/;

export function encodePathDescriptionWithNativeTitle(title: string, description: string): string {
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  if (!trimmedTitle) {
    return trimmedDescription;
  }

  return `@native-title:${trimmedTitle}@\n${trimmedDescription}`;
}

export function decodeNativePathFields(storedDescription: string): {
  nativeTitle: string | null;
  description: string;
} {
  const match = storedDescription.match(NATIVE_TITLE_MARKER);
  if (!match?.[1]) {
    return {
      nativeTitle: null,
      description: storedDescription.trim(),
    };
  }

  return {
    nativeTitle: match[1].trim(),
    description: storedDescription.replace(NATIVE_TITLE_MARKER, "").trim(),
  };
}
