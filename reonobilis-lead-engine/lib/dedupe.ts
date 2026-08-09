import { createHash } from 'crypto';

const LEGAL_SUFFIXES = [
  'gmbh & co\\. kg',
  'gmbh & co kg',
  'gmbh',
  'ug \\(haftungsbeschränkt\\)',
  'ug',
  'ag',
  'kgaa',
  'kg',
  'ohg',
  'gbr',
  'e\\.?k\\.?',
  'se',
  'mbh',
  'co\\.',
];

const SUFFIX_RE = new RegExp(`\\b(${LEGAL_SUFFIXES.join('|')})\\b\\.?`, 'gi');

/** Normalizes a company name for comparison: lowercase, strips legal form
 * suffixes and punctuation, collapses whitespace. */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(SUFFIX_RE, ' ')
    .replace(/[.,;:&\-/\\()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeLocation(location: string | null | undefined): string {
  if (!location) return '';
  return location
    .toLowerCase()
    .replace(/[.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stable hash used as the DB unique key to reject exact re-scrapes. */
export function computeDedupeHash(name: string, location: string | null | undefined): string {
  const key = `${normalizeCompanyName(name)}|${normalizeLocation(location)}`;
  return createHash('sha256').update(key).digest('hex');
}

/** Classic Levenshtein edit distance. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/** Similarity ratio in [0, 1], 1 = identical, based on Levenshtein distance. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

const FUZZY_THRESHOLD = 0.92;

/** True if candidate (name, location) is a near-duplicate of an existing lead. */
export function isFuzzyDuplicate(
  candidateName: string,
  candidateLocation: string | null | undefined,
  existingName: string,
  existingLocation: string | null | undefined
): boolean {
  const nameSim = similarity(normalizeCompanyName(candidateName), normalizeCompanyName(existingName));
  if (nameSim < FUZZY_THRESHOLD) return false;
  const locA = normalizeLocation(candidateLocation);
  const locB = normalizeLocation(existingLocation);
  if (!locA || !locB) return nameSim >= FUZZY_THRESHOLD;
  return similarity(locA, locB) >= FUZZY_THRESHOLD;
}
