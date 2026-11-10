-- Programmes et elements de programme (US-07, annexe D). Un programme appartient
-- a une filiere et porte au plus un fil rouge. Un element ordonne un exercice
-- dans le programme. Les defis s'ajouteront a ce modele plus tard.
CREATE TABLE programme (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  filiere_id TEXT NOT NULL REFERENCES filiere(id),
  fil_rouge_id TEXT REFERENCES fil_rouge(id)
);

CREATE TABLE element_programme (
  id TEXT PRIMARY KEY,
  programme_id TEXT NOT NULL REFERENCES programme(id),
  position INTEGER NOT NULL,
  exercice_identifiant TEXT NOT NULL REFERENCES exercice(identifiant)
);

CREATE INDEX idx_element_programme ON element_programme (programme_id);
