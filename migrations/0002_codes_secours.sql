-- Codes de secours du compte formateur, EM-ACC-13. Ranges en JSON : pour chaque
-- code, un sel propre et le HMAC du code, en hexadecimal, avec son etat consomme.
-- Jamais le code en clair. Seuls les comptes formateur en portent. Les comptes
-- existants recoivent une liste vide.
ALTER TABLE compte ADD COLUMN codes_secours TEXT NOT NULL DEFAULT '[]';
