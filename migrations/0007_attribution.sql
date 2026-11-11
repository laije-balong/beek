-- Attribution d'un programme a un apprenant (UC-04) et progression par element
-- (annexe D). Un apprenant ne recoit un programme qu'une fois (UC-04 A3).
CREATE TABLE attribution (
  id TEXT PRIMARY KEY,
  apprenant_id TEXT NOT NULL REFERENCES compte(id),
  programme_id TEXT NOT NULL REFERENCES programme(id),
  date INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_attribution_unique ON attribution (apprenant_id, programme_id);

CREATE TABLE progression_element (
  id TEXT PRIMARY KEY,
  attribution_id TEXT NOT NULL REFERENCES attribution(id),
  element_id TEXT NOT NULL REFERENCES element_programme(id),
  statut TEXT NOT NULL,
  reponses_fausses INTEGER NOT NULL DEFAULT 0,
  date_explication INTEGER,
  xp_gagnes INTEGER NOT NULL DEFAULT 0,
  date_ouverture INTEGER,
  date_fin INTEGER,
  temps_passe_ms INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_progression_attribution ON progression_element (attribution_id);
CREATE INDEX idx_progression_element ON progression_element (element_id);
