export const RESERVED_SLUGS = [
  'login', 'signup', 'dashboard', 'discover', 'products', 'settings',
  'api', 'auth', 'checkout', 'admin', 'help', 'about', 'pricing',
  'onboarding', 'account', 'payouts', 'store', 'learning', 'courses',
  'categories', 'cart', 'community', 'webinar', 'coaching', 'certificates',
  'verification', 'health', 'upload', 'files', 'root', 'index'
];

/** Canonical public URL slug: trim, lowercase, strip @ and slashes, keep [a-z0-9_-]. */
export function normalizeSlug(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\/+/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 30)
}

export function slugify(text) {
  if (!text || typeof text !== 'string') return 'creator-store';
  const slug = text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/['’]/g, '') // remove apostrophes cleanly (Ruhan's -> ruhans)
    .replace(/[^a-z0-9]/g, '-') // replace non-alphanumeric chars with hyphens
    .replace(/-+/g, '-') // collapse consecutive hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens

  return slug || 'creator-store';
}

export function isReservedSlug(slug) {
  if (!slug) return true;
  return RESERVED_SLUGS.includes(String(slug).toLowerCase().trim());
}

export async function generateUniqueStoreSlug(storeName, creatorId, isTakenFn) {
  const baseSlug = slugify(storeName);
  let candidateSlug = baseSlug;
  let counter = 1;

  while (isReservedSlug(candidateSlug) || (await isTakenFn(candidateSlug, creatorId))) {
    counter += 1;
    candidateSlug = `${baseSlug}-${counter}`;
  }

  return candidateSlug;
}
