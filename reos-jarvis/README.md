# REOS JARVIS
### Personal Intelligence System — REOS Platform GmbH

---

## Was ist JARVIS?

JARVIS ist Max Köhls externes Gehirn. Ein Windows Desktop-App mit Iron-Man-HUD-Ästhetik, die Anthropic Claude als KI-Motor nutzt und folgende Funktionen vereint:

- **JARVIS Chat** — Claude mit vollständigem REOS-Wissen, auf Augenhöhe
- **Chat Universe Globe** — Rotierende 3D-Kugel mit allen Gesprächen als Kontinente
- **Aufgaben & Accountability** — Windows-Notifications, Mon–Sa Checks, ARBEITEN/VERSAGEN
- **Google Calendar** — Termine lesen und erstellen per Chat-Befehl
- **Dokumenten-Generierung** — DOCX, XLSX, PPTX direkt aus dem Chat
- **iPhone PWA** — Aufgaben und Accountability-Checks am iPhone
- **Wissensdatenbank** — JARVIS lernt aus jedem Gespräch

---

## Installation (Windows)

```bash
cd reos-jarvis
npm install
npm start
```

Für Produktions-Build:
```bash
npm run build
# → dist/REOS-JARVIS-Setup-1.0.0.exe
```

---

## Erststart-Wizard

1. **Anthropic API-Key** unter Einstellungen → ANTHROPIC API hinterlegen (`sk-ant-...`)
2. **REOS Logo** in `assets/reos-logo.png` ablegen (gold building icon, PNG)
3. **Google Calendar** (optional): Client ID + Secret in Einstellungen, dann "GOOGLE AUTHENTIFIZIEREN"
4. App neu starten

---

## iPhone PWA Setup

1. Desktop-App starten
2. Einstellungen → QR-Code anzeigen
3. iPhone → Safari → QR scannen → URL öffnen
4. "Zum Home-Bildschirm hinzufügen"
5. JARVIS erscheint als App auf dem Home-Screen

---

## Chat-Befehle

| Befehl | Funktion |
|--------|----------|
| `Merk dir das: [Info]` | Permanente Wissensbasis-Ergänzung |
| `Ab jetzt: [Regel]` | Neue Verhaltensregel für JARVIS |
| `Vergiss [Thema]` | Einträge aus KB löschen |
| `Was weißt du über mich?` | Wissensdatenbank öffnen |
| `Was sind heute meine 3 wichtigsten Aufgaben?` | Tages-Priorisierung |
| `Hier ist eine Meeting-Zusammenfassung: [...]` | Auto-Task-Extraktion |
| `Schreib ein Cold-Outreach für [Person]` | REOS-konformes Outreach |
| `Erstelle Pricing-Dokument` | DOCX-Generation |

---

## Tastenkürzel

| Kürzel | Funktion |
|--------|----------|
| `Ctrl+Shift+J` | JARVIS überall öffnen (global) |
| `Ctrl+N` | Neues Gespräch |
| `Ctrl+T` | Neue Aufgabe |
| `Ctrl+G` | Globe-Ansicht |
| `Ctrl+L` | Listen-Ansicht |
| `Escape` | Panel/Dialog schließen |

---

## Kosten

Mit aktivem Prompt-Caching:
- ~$0.50–$2.00/Tag bei normalem Einsatz
- Max $5–10/Tag bei intensivem Einsatz
- API-Key: https://console.anthropic.com

---

## Troubleshooting

**JARVIS startet nicht:** Node.js 20+ prüfen (`node --version`)

**Benachrichtigungen fehlen:** Windows → Einstellungen → Benachrichtigungen → App erlauben

**Google Calendar:** Einstellungen → Google Authentifizieren (erneut)

**Sprache:** Chromium (Electron) muss deutsche Stimme installiert haben

---

**JARVIS wird mit jedem Gespräch smarter. Nutze es.**
