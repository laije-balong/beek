-- Taxonomie du contenu : domaine, filiere, niveau, notion (US-05, annexe D).
-- L'ordre range les elements entre freres. Les trois niveaux d'une filiere sont
-- crees d'office et ne se modifient pas (US-05 CA3).

CREATE TABLE domaine (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  ordre INTEGER NOT NULL
);

CREATE TABLE filiere (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  domaine_id TEXT NOT NULL REFERENCES domaine(id)
);

CREATE TABLE niveau (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  filiere_id TEXT NOT NULL REFERENCES filiere(id)
);

CREATE TABLE notion (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  niveau_id TEXT NOT NULL REFERENCES niveau(id)
);

-- Unicite : nom de domaine unique dans Beek, nom de filiere unique dans son
-- domaine, nom de notion unique dans son niveau.
CREATE UNIQUE INDEX idx_domaine_nom ON domaine (nom);
CREATE UNIQUE INDEX idx_filiere_nom ON filiere (domaine_id, nom);
CREATE UNIQUE INDEX idx_notion_nom ON notion (niveau_id, nom);

CREATE INDEX idx_filiere_domaine ON filiere (domaine_id);
CREATE INDEX idx_niveau_filiere ON niveau (filiere_id);
CREATE INDEX idx_notion_niveau ON notion (niveau_id);
