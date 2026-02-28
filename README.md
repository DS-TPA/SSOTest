# Profilgenerator (Node.js)

Node.js-Anwendung, die ein Profil aus JSON-Daten in ein HTML-Dokument rendert und optional als PDF exportiert.

## Features

- HTML-Template mit Platzhaltern (`{{...}}`) über eine eingebaute {{ }}-Template-Engine
- Optionale Abschnitte werden automatisch ausgeblendet (z. B. `Zertifizierungen`)
- 0..n Einträge pro Abschnitt (z. B. Projekterfahrungen)
- Firmen-Branding über JSON-Konfiguration (Farbe, Logo, CSS)
- Ausgabe als HTML und optional PDF (über lokales Chromium/Chrome)

## Projektstruktur

```text
src/
├─ assets/logos/            # Firmenlogos
├─ config/                  # Firmenkonfigurationen
├─ data/                    # Beispielprofile
├─ styles/                  # Basis- und Firmen-CSS
├─ templates/
│  └─ profile.template.html # Bearbeitbares HTML-Template
└─ index.js                 # Generator-Logik
output/                     # Generierte Dateien
```

## Installation

```bash
npm install
```

## Nutzung

### 1) Standard-HTML erzeugen

```bash
npm run generate
```

- Nutzt standardmäßig:
  - Profil: `src/data/profile-with-certs.json`
  - Firma: `company-a`
- Schreibt:
  - `output/profile.html`
  - `output/profile.css`

### 2) Profil ohne Zertifizierungen erzeugen

```bash
npm run generate:no-certs
```

Hier fehlt im JSON der Bereich `certifications`; der Abschnitt `Zertifizierungen` erscheint daher nicht im HTML.

### 3) PDF exportieren

Empfohlen über Script:

```bash
npm run generate:pdf
```

Alternativ über das Standard-Script:

```bash
npm run generate -- --pdf
```

Hinweis: Je nach npm-Version wird `npm run generate --pdf` intern als npm-Flag interpretiert.
Der Generator unterstützt dafür einen Fallback und behandelt diesen Aufruf ebenfalls als PDF-Export.
Am zuverlässigsten bleibt aber `npm run generate -- --pdf` oder `npm run generate:pdf`.
Zusätzlich wird `output/profile.pdf` erzeugt.

Falls kein Browser automatisch gefunden wird:

```bash
node src/index.js --pdf --browser-path "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
```

Alternativ per Umgebungsvariable:

```bash
set PROFILE_PDF_BROWSER=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe
npm run generate -- --pdf
```

Hinweis zu Chrome-Fenstern:
Der PDF-Export startet Chrome/Edge mit einem temporären Profil im Headless-Modus (`--headless=new`).
Damit sollte kein sichtbares Startseiten-Fenster mehr aufgehen.

## CLI-Optionen

```text
--company <name>       Firmenkonfig aus src/config/<name>.json
--profile <path>       Profil-JSON
--template <path>      HTML-Template (mit {{ }} Platzhaltern)
--output-html <path>   Zielpfad für HTML
--output-pdf <path>    Zielpfad für PDF
--browser-path <path>  Expliziter Pfad zu Chrome/Chromium/Edge
--pdf                  PDF-Erzeugung aktivieren
```

## Anpassung pro Firma

`src/config/company-a.json`:

```json
{
  "companyName": "Firma A GmbH",
  "primaryColor": "#0055A4",
  "logoPath": "src/assets/logos/company-a.svg",
  "cssFile": "src/styles/company-a.css"
}
```

Für eine neue Firma einfach neue Config, neues Logo und optional neues CSS anlegen.

## Template-Prinzip

Das Template in `src/templates/profile.template.html` kann von Fachanwendern angepasst werden.

Beispiele:

- Einzelwert: `{{personal.name}}`
- Liste: `{{#each qualifications}}...{{/each}}`
- Optionaler Abschnitt: `{{#if (hasItems certifications)}}...{{/if}}`

Damit verschwinden leere Abschnitte vollständig.
