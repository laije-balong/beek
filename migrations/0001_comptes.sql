-- Comptes des utilisateurs, sur la base unique. Le sel et le verificateur sont
-- stockes en hexadecimal. Les dates sont en millisecondes depuis l'epoque.
CREATE TABLE compte (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  statut TEXT NOT NULL,
  sel TEXT NOT NULL,
  verificateur TEXT NOT NULL,
  expiration_mot_de_passe_temporaire INTEGER,
  date_creation INTEGER NOT NULL,
  date_activation INTEGER,
  date_consentement INTEGER,
  echecs_connexion INTEGER NOT NULL DEFAULT 0,
  fin_blocage INTEGER,
  statut_avant_blocage TEXT,
  mots_de_passe_temporaires_du_jour INTEGER NOT NULL DEFAULT 0,
  jour_des_mots_de_passe_temporaires TEXT
);

CREATE INDEX idx_compte_email ON compte (email);
