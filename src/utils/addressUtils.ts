export function formatAddress(address: string | undefined | null): string {
  if (!address) return 'Neuvedená';
  // Remove ", okres X" and ", X kraj" and ", Slovensko" and postal codes
  return address
    .replace(/,?\s*okres\s+[^,]+/gi, '')
    .replace(/,?\s*[A-Za-zÀ-žА-я]+\s+kraj/gi, '')
    .replace(/,?\s*Slovensko/gi, '')
    .replace(/,?\s*\d{3}\s?\d{2}/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*$/g, '')
    .trim();
}
