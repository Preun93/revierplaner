/* Jagdzeiten Nordrhein-Westfalen
 * Quelle: Landesjagdzeitenverordnung NRW (LJZeitVO) vom 28.05.2015, Stand SGV. NRW. 7.1.2025,
 *         und LJV-NRW-Jahresübersicht „Jagdzeiten in Nordrhein-Westfalen“, Stand 01.09.2025.
 * Zeiträume: [Startmonat, Starttag, Endmonat, Endtag] – darf über den Jahreswechsel laufen.
 * Fußnoten verweisen auf JAGDZEITEN_NRW.notes. */
(function () {
  'use strict';
  const ALL = [[1, 1, 12, 31]];

  window.JAGDZEITEN_NRW = {
    stand: 'LJZeitVO NRW, Fassung vom 7.1.2025 · LJV-Übersicht vom 01.09.2025',
    quelle: 'https://ljv-nrw.de/wp-content/uploads/2025/09/Jahresuebersicht-Jagdzeiten-Stand-01-09-2025.pdf',
    groups: [
      {
        name: 'Schalenwild',
        items: [
          { art: 'Rotwild', detail: 'Hirsche, Alttiere, Kälber', periods: [[8, 1, 1, 31]] },
          { art: 'Rotwild', detail: 'Schmalspießer, Schmaltiere', periods: [[5, 1, 5, 31], [8, 1, 1, 31]] },
          { art: 'Dam- und Sikawild', detail: 'Hirsche, Alttiere, Kälber', periods: [[8, 1, 1, 31]] },
          { art: 'Dam- und Sikawild', detail: 'Schmalspießer, Schmaltiere', periods: [[5, 1, 5, 31], [8, 1, 1, 31]] },
          { art: 'Rehwild', detail: 'Böcke', periods: [[5, 1, 1, 31]] },
          { art: 'Rehwild', detail: 'Schmalrehe', periods: [[5, 1, 5, 31], [9, 1, 1, 31]] },
          { art: 'Rehwild', detail: 'Ricken und Kitze', periods: [[9, 1, 1, 31]] },
          { art: 'Muffelwild', periods: [[8, 1, 1, 31]] },
          {
            art: 'Schwarzwild', detail: 'Keiler, Bachen, Überläufer', periods: [[8, 1, 1, 31]],
            // § 1 Abs. 3 LJZeitVO: bis 31.01.2028 ganzjährig
            sonder: { bis: '2028-01-31', periods: ALL }, note: 'sw'
          },
          { art: 'Schwarzwild', detail: 'Frischlinge (noch nicht einjährig)', periods: ALL }
        ]
      },
      {
        name: 'Hase, Kaninchen und Raubwild',
        items: [
          { art: 'Feldhase', periods: [[10, 16, 12, 31]] },
          { art: 'Wildkaninchen', periods: [[10, 16, 2, 28]], note: 'aufh' },
          { art: 'Wildkaninchen', detail: 'Jungkaninchen', periods: ALL },
          { art: 'Fuchs', periods: [[7, 16, 2, 28]] },
          { art: 'Fuchs', detail: 'Jungfüchse', periods: ALL },
          { art: 'Dachs', periods: [[9, 1, 12, 31]], note: 'dachs' },
          { art: 'Dachs', detail: 'Jungdachse', periods: ALL, note: 'dachs' },
          { art: 'Steinmarder', periods: [[10, 16, 2, 28]] },
          { art: 'Iltis', periods: [[10, 16, 2, 28]] },
          { art: 'Hermelin', periods: [[9, 1, 2, 28]] },
          { art: 'Mink', periods: [[10, 16, 2, 28]] },
          { art: 'Waschbär', periods: [[8, 1, 2, 28]] },
          { art: 'Waschbär', detail: 'Jungwaschbären', periods: ALL },
          { art: 'Marderhund', periods: [[9, 1, 2, 28]] },
          { art: 'Marderhund', detail: 'Jungmarderhunde', periods: ALL }
        ]
      },
      {
        name: 'Federwild',
        items: [
          { art: 'Fasan', periods: [[10, 16, 1, 15]] },
          { art: 'Rebhuhn', periods: [], note: 'rebhuhn' },
          { art: 'Wildtruthahn', periods: [[3, 16, 4, 30]] },
          { art: 'Ringeltaube', periods: [[11, 1, 2, 20]], note: 'aufh' },
          { art: 'Höckerschwan', periods: [[11, 1, 2, 20]] },
          { art: 'Grau-, Kanada- und Nilgans', periods: [[7, 16, 1, 31]], note: 'gans' },
          { art: 'Nilgans', detail: 'Juvenile Nilgänse', periods: ALL, note: 'gans' },
          { art: 'Stockente', periods: [[9, 16, 1, 15]] },
          { art: 'Waldschnepfe', periods: [[10, 16, 1, 15]] },
          { art: 'Rabenkrähe', periods: [[8, 1, 3, 10]], note: 'aufh' },
          { art: 'Elster', periods: [[8, 1, 2, 28]] }
        ]
      },
      {
        name: 'Sonderregelungen (kein Jagdrecht)',
        items: [
          { art: 'Kormoran', detail: 'nach Kormoranverordnung NRW', periods: [[8, 16, 3, 1]], note: 'kormoran' },
          { art: 'Bisam und Nutria', detail: 'nach Erlass vom 27.12.2022', periods: ALL }
        ]
      }
    ],
    notes: {
      sw: 'Bis 31.01.2028 ganzjährig (§ 1 Abs. 3 LJZeitVO), danach 1. Aug. – 31. Jan. Führende Bachen mit Frischlingen unter 25 kg sind nach § 22 Abs. 4 BJagdG geschont.',
      aufh: 'Hat die untere Jagdbehörde die Schonzeit wegen Wildschäden aufgehoben, ist die Jagd auch in der Setz- und Brutzeit zulässig (Allgemeinverfügung beachten).',
      dachs: 'Baujagd auf Dachse im Naturbau ist verboten (§ 19 Abs. 1 Nr. 8 LJG-NRW).',
      rebhuhn: 'Ganzjährige Schonzeit in NRW (bis 31.12.2027).',
      gans: 'Schonzeit vom 15. Okt. bis 31. Jan. in den Gebieten „Unterer Niederrhein“ und „Weseraue“.',
      kormoran: 'Nur an Gewässern und Fischzuchtanlagen; 1,5 h vor Sonnenaufgang bis 1,5 h nach Sonnenuntergang. Vom 2. März bis 15. Aug. nur Jungkormorane (Jugendkleid, nicht brütend), Sonnenauf- bis -untergang.'
    }
  };
})();
