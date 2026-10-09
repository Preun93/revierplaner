/* Supabase-Verbindung für die geräteübergreifende Speicherung.
 * Werte aus Supabase: Project Settings → API (bzw. "Data API").
 * Der "anon"-Schlüssel ist öffentlich gedacht; geschützt werden die Daten
 * über Row Level Security (siehe supabase/schema.sql).
 * Bleiben die Felder leer, läuft der Planer nur lokal im Browser. */
window.REVIER_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: ''
};
