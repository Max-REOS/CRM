# Reonobilis Lead Engine

Automatisierte B2B-Lead-Sammlung aus öffentlich zugänglichen deutschen Quellen,
kategorisiert in 8 fixen Kategorien, dedupliziert und in einem Dashboard
bereitgestellt. Phase-1-MVP nach dem Build-Brief vom 08.08.2026.

## Status: Phase 1 (MVP)

Umgesetzt:

- Next.js 16 App-Router-Grundgerüst, SQLite-Datenmodell (`leads`,
  `status_history`, `scrape_runs`)
- Dedupe-Layer (exakter Hash + Fuzzy-Match auf normalisierten
  Firmennamen/Ort)
- Scraper für `struggling` (insolvenzbekanntmachungen.de) und
  `buybusiness`/`scalesell` (nexxt-change.org, beide Seiten: Kauf- und
  Verkaufsangebote)
- Dashboard: 8 Kategorie-Tabs mit Live-Counts, Suche, Status-Filter,
  Status-Pipeline (Neu → Kontaktiert → Verhandlung → Closed/Verloren) mit
  Verlauf, „Neu seit gestern"-Badge, CSV-Export
- Einfacher Passwortschutz (eine gemeinsame Session, kein öffentliches
  System — siehe Brief Abschnitt 4)
- Täglicher GitHub-Actions-Cron (`.github/workflows/reonobilis-daily-scrape.yml`,
  liegt aktuell im CRM-Repo-Root, siehe Hinweis dort)

Noch nicht umgesetzt (Phase 2/3 laut Brief Abschnitt 9):

- Scraper `website`, `newproduct`, `newmarket`, `restructure`, `investment`
- PWA (`manifest.json`, Service Worker, iOS-Push)
- Windows-Systray/JARVIS-Integration

## ⚠️ Wichtige Einschränkungen aus dieser Bau-Session

**1. Scraper-Selektoren sind unverifiziert.** Die Sandbox, in der dieses
Projekt gebaut wurde, hat keinen ausgehenden Internetzugriff (Egress-Proxy
blockiert beliebige Domains). Die beiden Scraper in `lib/scrapers/` sind
strukturell vollständig (Rate-Limiting, robots.txt-Check, Dedupe, Fehler-
Logging), aber die CSS-Selektoren für die jeweilige Ergebnisliste sind
best-effort und **müssen beim ersten echten Lauf verifiziert werden**:

```bash
npm run scrape -- struggling-insolvenzbekanntmachungen
npm run scrape -- succession-nexxtchange
```

Liefert ein Lauf 0 Treffer trotz vorhandener Einträge auf der Seite, die
Such-URL im Browser öffnen, die DOM-Struktur der Ergebnisliste inspizieren
und die `CONFIG`/`FIELDS`-Objekte am Dateikopf anpassen. Beide Dateien sind
absichtlich so geschrieben, dass diese Anpassung an einer Stelle passiert.

**2. Hosting: nicht auf Vercel deployen (jedenfalls nicht für Schreibzugriffe).**
Vercel-Serverless-Functions haben ein read-only Dateisystem außerhalb von
`/tmp`, und `/tmp` überlebt keinen Cold-Start/Redeploy. Der tägliche Scrape
läuft ohnehin in GitHub Actions und committet `data/reonobilis.db` direkt
ins Repo — das funktioniert unabhängig vom Hosting. Aber: **Status-Klicks im
Dashboard** (Neu → Kontaktiert → …) schreiben ebenfalls in dieselbe
SQLite-Datei. Auf Vercel würden diese Schreibvorgänge beim nächsten
Cold-Start wieder verschwinden.

→ Empfehlung: die App auf Railway oder Render hosten (beide im Brief
bereits als Optionen für den Scraper-Worker genannt) mit einem persistenten
Volume für `data/`. Dort funktioniert der aktuelle Code unverändert — echtes
SQLite-File auf Disk, kein serverloses Dateisystem-Problem. Vercel eignet
sich nur für eine reine Lesansicht (die täglich per Deploy-Hook neu gebaut
wird, siehe `VERCEL_DEPLOY_HOOK_URL` in `.env.example`).

**3. Liegt aktuell im CRM-Repo, nicht in einem eigenen Repo.** Die
GitHub-Integration dieser Session hatte keine Berechtigung, ein neues
Repository anzulegen (403). Der Code liegt deshalb komplett eigenständig
(kein gemeinsamer Code mit der REOS-CRM-App) im Ordner
`reonobilis-lead-engine/` dieses Repos. Extraktion in ein eigenes Repo:

```bash
git subtree split --prefix=reonobilis-lead-engine -b reonobilis-standalone
# neues leeres Repo auf GitHub anlegen, dann:
git push <neues-repo-remote> reonobilis-standalone:main
```

Danach `.github/workflows/reonobilis-daily-scrape.yml` vom CRM-Repo-Root in
`<neues-repo>/.github/workflows/daily-scrape.yml` verschieben und die
`working-directory`/`cache-dependency-path`-Präfixe entfernen.

## Setup

```bash
cd reonobilis-lead-engine
npm install
npx playwright install chromium   # einmalig, für die Scraper
cp .env.example .env.local        # Werte ausfüllen
npm run dev
```

Erststart legt `data/reonobilis.db` automatisch mit leerem Schema an.

## Manuelles Scrapen

```bash
npm run scrape                                       # alle Quellen
npm run scrape -- struggling-insolvenzbekanntmachungen
npm run scrape -- succession-nexxtchange
```

## Rechtliches (siehe Brief Abschnitt 8)

- Beide Scraper prüfen `robots.txt` vor jedem Lauf und respektieren
  `Disallow`-Regeln für unseren User-Agent (`ReonobilisLeadEngine`) bzw. `*`.
- Rate-Limiting: max. 1 Request/Sekunde pro Host (`lib/scrapers/rateLimiter.ts`).
- Alle Quellen sind öffentliche B2B-Registerdaten (Handelsregister,
  Insolvenzbekanntmachungen, Nachfolgebörse), keine Daten von
  Privatpersonen.
