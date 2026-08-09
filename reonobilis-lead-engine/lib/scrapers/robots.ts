const robotsCache = new Map<string, { rules: Rule[]; fetchedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h, fine for a job that runs once/day

interface Rule {
  agent: string;
  disallow: string[];
}

/** Minimal robots.txt parser: only what we need (User-agent / Disallow blocks). */
function parseRobots(text: string): Rule[] {
  const rules: Rule[] = [];
  let current: Rule | null = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      current = { agent: value.toLowerCase(), disallow: [] };
      rules.push(current);
    } else if (key === 'disallow' && current) {
      if (value) current.disallow.push(value);
    }
  }
  return rules;
}

async function getRobotsRules(origin: string): Promise<Rule[]> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.rules;

  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': 'ReonobilisLeadEngine/1.0 (+internal business tool)' },
    });
    if (!res.ok) {
      robotsCache.set(origin, { rules: [], fetchedAt: Date.now() });
      return [];
    }
    const rules = parseRobots(await res.text());
    robotsCache.set(origin, { rules, fetchedAt: Date.now() });
    return rules;
  } catch {
    // If robots.txt itself is unreachable, err on the side of caution and
    // return no rules (caller still applies rate limiting).
    return [];
  }
}

/** Checks whether `url`'s path is disallowed for our scraper user-agent (falls back to `*`). */
export async function isAllowedByRobots(url: string): Promise<boolean> {
  const u = new URL(url);
  const origin = u.origin;
  const rules = await getRobotsRules(origin);
  if (rules.length === 0) return true;

  const ourRules =
    rules.find((r) => r.agent === 'reonobilisleadengine') ?? rules.find((r) => r.agent === '*');
  if (!ourRules) return true;

  return !ourRules.disallow.some((pattern) => pattern !== '' && u.pathname.startsWith(pattern));
}
