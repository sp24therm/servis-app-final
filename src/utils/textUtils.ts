// Odstráni diakritiku pre vyhľadávanie
export const removeDiacritics = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); // CHANGED: extracted utility
};

// Normalizuje telefónne číslo
export const sanitizePhone = (phone: string): string => {
  return phone.replace(/\s+/g, ''); // CHANGED: extracted utility
};
