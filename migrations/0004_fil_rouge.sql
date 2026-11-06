-- Fils rouges, univers communs aux exercices, defis et programmes (US-06,
-- annexe D). Par exemple le Cyber Mwinda. Le nom est unique dans Beek.
CREATE TABLE fil_rouge (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX idx_fil_rouge_nom ON fil_rouge (nom);
