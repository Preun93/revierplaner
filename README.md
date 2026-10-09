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
- **Export/Import** als GeoJSON (z. B. für QGIS, Google Earth) und Sicherung aller Reviere

Die Daten werden ausschließlich im Browser (localStorage) gespeichert. Regelmäßig über **Daten → Sicherung** exportieren!

## Anmeldung
Beim Öffnen erscheint eine Anmeldeseite. Die Zugangsdaten werden nur als SHA-256-Hash in `js/auth.js` geprüft.
**Hinweis:** Da die App eine statische Seite ist, ist dies eine einfache Zugangssperre und kein echter Schutz – wer den Quellcode kennt, kann sie umgehen. Das GitHub-Repository sollte daher privat sein bzw. keine sensiblen Daten enthalten (die Revierdaten selbst liegen ohnehin nur im Browser).

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
