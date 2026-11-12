-- Commentaires sous un exercice (EM-AID-04). L'echange est entre un apprenant et
-- le formateur, sur un exercice. Texte seul, 500 caracteres au plus (RG-31). Le
-- serveur controle le nombre (RG-32, RG-33). Le statut masque sert a US-18.
CREATE TABLE commentaire (
  id TEXT PRIMARY KEY,
  exercice_identifiant TEXT NOT NULL REFERENCES exercice(identifiant),
  apprenant_id TEXT NOT NULL REFERENCES compte(id),
  auteur TEXT NOT NULL,
  texte TEXT NOT NULL,
  date INTEGER NOT NULL,
  masque INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_commentaire_fil ON commentaire (apprenant_id, exercice_identifiant, date);
CREATE INDEX idx_commentaire_apprenant_date ON commentaire (apprenant_id, date);
