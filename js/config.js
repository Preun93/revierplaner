/* Supabase-Verbindung für die geräteübergreifende Speicherung.
 * Werte aus Supabase: Project Settings → API (bzw. "Data API").
 * Der "anon"-Schlüssel ist öffentlich gedacht; geschützt werden die Daten
 * über Row Level Security (siehe supabase/schema.sql).
 * Bleiben die Felder leer, läuft der Planer nur lokal im Browser. */
window.REVIER_CONFIG = {
  supabaseUrl: 'https://znaggjvxrcdvtwqkwvlb.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYWdnanZ4cmNkdnR3cWt3dmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1Njk1OTksImV4cCI6MjEwNzE0NTU5OX0.YzpV9Rq-uxPTzuUTjaEtZjmkywLDV3rWN7jSa_hT3ec'
};
