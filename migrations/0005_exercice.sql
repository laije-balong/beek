-- Exercices, section 3 du referentiel. Les champs communs sont des colonnes. Le
-- contenu propre au type et les images sont ranges en JSON. La reponse attendue,
-- les indices et l'explication restent dans ces donnees, cote serveur (EM-EXE-03).
-- L'identifiant est le code choisi par le formateur, unique, qui sert au
-- remplacement lors d'un rechargement.
CREATE TABLE exercice (
  identifiant TEXT PRIMARY KEY,
  nature TEXT NOT NULL,
  type TEXT NOT NULL,
  titre TEXT NOT NULL,
  notion_id TEXT NOT NULL REFERENCES notion(id),
  fil_rouge_id TEXT REFERENCES fil_rouge(id),
  duree_minutes INTEGER NOT NULL,
  enonce TEXT NOT NULL,
  images TEXT NOT NULL DEFAULT '[]',
  collage_autorise INTEGER NOT NULL DEFAULT 1,
  indice_generique TEXT NOT NULL,
  explication_detaillee TEXT NOT NULL,
  contenu TEXT NOT NULL
);

CREATE INDEX idx_exercice_notion ON exercice (notion_id);
CREATE INDEX idx_exercice_fil_rouge ON exercice (fil_rouge_id);
