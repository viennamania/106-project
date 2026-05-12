const IMAGE_PHOTO_QUALITY_TERMS = [
  "realistic photo",
  "professional photography",
  "cinematic angle",
  "dynamic back light shining",
] as const;

export function applyImagePhotoQualityPreset(prompt: string) {
  const normalized = prompt.trim();

  if (!normalized) {
    return IMAGE_PHOTO_QUALITY_TERMS.join(", ");
  }

  const lowerPrompt = normalized.toLowerCase();
  const missingTerms = IMAGE_PHOTO_QUALITY_TERMS.filter(
    (term) => !lowerPrompt.includes(term),
  );

  if (missingTerms.length === 0) {
    return normalized;
  }

  return `${normalized} Image quality: ${missingTerms.join(", ")}.`;
}
