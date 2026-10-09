# Revierplaner

Web-App zum Einzeichnen eines Jagdreviers auf einer Satellitenkarte – inspiriert von „Jagdgefährte“.

## Funktionen
- **Reviergrenze zeichnen** und nachträglich bearbeiten (Fläche in ha und Grenzlänge werden berechnet)
- **Punkte setzen** – farbig und benennbar, mit Notiz:
  - 🔵 Ansitzeinrichtung · 🟢 Fütterung · 🟤 Bau · 🔴 Falle · 🟣 Luderplatz
- Punkte bearbeiten, verschieben und löschen
- **Mehrere Reviere** anlegen, umbenennen und wechseln
- **Filter** nach Punktart, Namen ein-/ausblenden
- Kartenansichten: Satellit (mit/ohne Beschriftung), Straßenkarte, Topografisch
- Ortssuche und eigener Standort
- **Kompass** unten links (passend zur eingenordeten Karte) mit blauem **Windpfeil**
- **Wetter** im Revier: Temperatur, Wetterlage, Windrichtung/-stärke und Vorschau der nächsten Stunden (Open-Meteo)
- **Export/Import** als GeoJSON (z. B. für QGIS, Google Earth) und Sicherung aller Reviere

Die Daten werden ausschließlich im Browser (localStorage) gespeichert. Regelmäßig über **Daten → Sicherung** exportieren!

## Anmeldung & Synchronisierung
Beim Öffnen erscheint eine Anmeldeseite (Name **Welte**).

- **Mit Supabase** (empfohlen): Die Revierdaten liegen online und sind auf allen Geräten gleich; Änderungen erscheinen auf anderen geöffneten Geräten live. Die Anmeldung läuft über Supabase Auth – ohne Login sind die Daten nicht abrufbar.
- **Ohne Supabase** (`js/config.js` leer): Daten nur im Browser, einfache lokale Zugangssperre.

### Supabase einrichten (einmalig)
1. Auf https://supabase.com kostenlos registrieren → **New project** anlegen (Region z. B. Frankfurt).
2. **SQL Editor** → Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen → **Run**.
3. **Authentication → Users → Add user → Create new user**: E-Mail `welte@revierplaner.app`, Passwort festlegen, **Auto Confirm User** anhaken.
4. **Authentication → Sign In / Providers**: **Allow new users to sign up** ausschalten (sonst könnte sich jeder selbst ein Konto anlegen).
5. **Project Settings → API**: *Project URL* und *anon public key* in `js/config.js` eintragen, committen und pushen.

Weitere Benutzer: in Schritt 3 einfach `<name>@revierplaner.app` anlegen – angemeldet wird mit `<name>`.

## Bedienung
1. Ort suchen oder Standort-Button nutzen.
2. **Grenze** (oben rechts) → Eckpunkte antippen → ersten Punkt erneut antippen oder **Fertig**.
3. Oranges **+** → Art wählen → auf die Karte tippen → Name/Notiz eingeben → Speichern.
4. Punkt antippen → Bearbeiten / Verschieben / Löschen.

## Starten
Keine Installation nötig – reine HTML/CSS/JS-Seite (Leaflet + Leaflet-Geoman über CDN).

- Lokal: `python3 -m http.server` im Projektordner, dann http://localhost:8000 öffnen.
- **GitHub Pages:** Repository → *Settings* → *Pages* → *Source: Deploy from a branch* → Branch `main`, Ordner `/ (root)` → *Save*. Nach ca. 1 Minute ist die App unter `https://<benutzername>.github.io/<repo>/` erreichbar.

## Kartendaten
Satellitenbilder © Esri, Maxar, Earthstar Geographics · Karten © OpenStreetMap-Mitwirkende, OpenTopoMap · Suche: Nominatim
