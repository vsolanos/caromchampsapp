export const COUNTRIES = [
  { iso: 'CR', name: 'Costa Rica', dial: '+506', pattern: /^\d{8}$/, hint: '8 dígitos. Ejemplo: 88738755' },
  { iso: 'PA', name: 'Panamá', dial: '+507', pattern: /^\d{7,8}$/, hint: '7 u 8 dígitos. Ejemplo: 61234567' },
  { iso: 'DO', name: 'República Dominicana', dial: '+1', pattern: /^\d{10}$/, hint: '10 dígitos. Ejemplo: 8095551234' },
  { iso: 'US', name: 'Estados Unidos', dial: '+1', pattern: /^\d{10}$/, hint: '10 dígitos. Ejemplo: 3055551234' },
  { iso: 'MX', name: 'México', dial: '+52', pattern: /^\d{10}$/, hint: '10 dígitos' },
  { iso: 'CO', name: 'Colombia', dial: '+57', pattern: /^\d{10}$/, hint: '10 dígitos' },
  { iso: 'ES', name: 'España', dial: '+34', pattern: /^\d{9}$/, hint: '9 dígitos' }
];

export function countryByIso(iso = 'CR') {
  return COUNTRIES.find((country) => country.iso === iso) || COUNTRIES[0];
}

export function normalizePhone(value = '') {
  return String(value || '').replace(/[^0-9]/g, '');
}

export function validatePhoneByCountry(countryIso, localPhone) {
  const country = countryByIso(countryIso);
  const phone = normalizePhone(localPhone);
  return {
    valid: country.pattern.test(phone),
    local: phone,
    e164: `${country.dial}${phone}`,
    country,
    message: country.pattern.test(phone) ? '' : `Teléfono inválido para ${country.name}. ${country.hint}`
  };
}
