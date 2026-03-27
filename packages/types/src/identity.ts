const NON_DIGIT_REGEX = /\D+/g;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const normalizePhoneNumber = (value: string) => {
  const digits = value.replace(NON_DIGIT_REGEX, '');

  if (!digits) {
    return '';
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  return value.trim().startsWith('+') ? `+${digits}` : `+${digits}`;
};

export const dedupeNormalizedValues = (values: string[], normalize: (value: string) => string) =>
  [...new Set(values.map(normalize).filter(Boolean))];
