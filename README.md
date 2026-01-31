# Azure AD OAuth2 SSO Demo

Diese minimale Demo zeigt ein Logon-Fenster mit OAuth2/SSO über Azure AD, umgesetzt mit der MSAL Browser Library.

## Voraussetzungen

- Eine registrierte Azure AD App
- Client-ID und Tenant-ID
- Ein lokaler HTTP-Server (z. B. `npx serve` oder VS Code Live Server)

## Einrichtung

1. Öffne `app.js` und ersetze:
   - `YOUR_CLIENT_ID` mit deiner App (Client) ID
   - `YOUR_TENANT_ID` mit deiner Tenant-ID
2. Stelle sicher, dass die Redirect URI in der App-Registrierung auf `http://localhost:5500` zeigt (oder passe den Wert in `app.js` an).

## Starten

```bash
npx serve . --listen 5500
```

Öffne danach `http://localhost:5500` im Browser.

## Hinweise

- Die Demo nutzt den `loginPopup` Flow, damit kein eigener Backend-Server nötig ist.
- Der Access Token wird nur gekürzt angezeigt.
- Bei Fehlern zeigt die UI zusätzlich Debug-Details (z. B. errorCode, correlationId) an.
