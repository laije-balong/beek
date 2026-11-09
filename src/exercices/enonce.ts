// Rendu de l'enonce en HTML sur. L'enonce accepte titres, gras, listes, blocs de
// code (section 3 du referentiel) et tableaux simples (point 3.3). Les blocs de
// code sont a chasse fixe, indentation conservee (point 3.4a). Tout le texte est
// echappe d'abord, puis seules les balises de mise en forme prevues sont posees.
// Aucune injection HTML n'est donc possible.

function echapper(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Mise en forme en ligne sur un texte deja echappe : code puis gras.
function enLigne(s: string): string {
  return s
    .replace(/`([^`]+)`/g, (_m, p1) => `<code>${p1}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, (_m, p1) => `<strong>${p1}</strong>`);
}

function cellules(ligne: string): string[] {
  return ligne
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function tableau(enTete: string[], corps: string[][]): string {
  const th = enTete.map((c) => `<th>${enLigne(echapper(c))}</th>`).join("");
  const trs = corps
    .map((r) => `<tr>${r.map((c) => `<td>${enLigne(echapper(c))}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

export function enonceVersHtml(texte: string): string {
  const lignes = texte.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraphe: string[] = [];
  let liste: string[] = [];
  let i = 0;

  const viderParagraphe = () => {
    if (paragraphe.length) {
      html.push(`<p>${paragraphe.map((l) => enLigne(echapper(l))).join("<br>")}</p>`);
      paragraphe = [];
    }
  };
  const viderListe = () => {
    if (liste.length) {
      html.push(`<ul>${liste.map((l) => `<li>${enLigne(echapper(l))}</li>`).join("")}</ul>`);
      liste = [];
    }
  };
  const vider = () => {
    viderParagraphe();
    viderListe();
  };

  while (i < lignes.length) {
    const ligne = lignes[i];

    // Bloc de code encadre par ```.
    if (/^```/.test(ligne)) {
      vider();
      const corps: string[] = [];
      i++;
      while (i < lignes.length && !/^```/.test(lignes[i])) {
        corps.push(lignes[i]);
        i++;
      }
      i++; // ligne de fermeture
      html.push(`<pre class="code">${echapper(corps.join("\n"))}</pre>`);
      continue;
    }

    // Tableau : une ligne de cellules suivie d'une ligne de separation.
    if (
      /^\s*\|.*\|\s*$/.test(ligne) &&
      i + 1 < lignes.length &&
      /^\s*\|[\s:|-]+\|\s*$/.test(lignes[i + 1])
    ) {
      vider();
      const enTete = cellules(ligne);
      i += 2;
      const corps: string[][] = [];
      while (i < lignes.length && /^\s*\|.*\|\s*$/.test(lignes[i])) {
        corps.push(cellules(lignes[i]));
        i++;
      }
      html.push(tableau(enTete, corps));
      continue;
    }

    // Titre de niveau 2 ou 3.
    const titre = /^(#{2,3})\s+(.*)$/.exec(ligne);
    if (titre) {
      vider();
      const niveau = titre[1].length;
      html.push(`<h${niveau}>${enLigne(echapper(titre[2]))}</h${niveau}>`);
      i++;
      continue;
    }

    // Element de liste.
    if (/^\s*-\s+/.test(ligne)) {
      viderParagraphe();
      liste.push(ligne.replace(/^\s*-\s+/, ""));
      i++;
      continue;
    }

    // Ligne vide : fin de bloc.
    if (ligne.trim() === "") {
      vider();
      i++;
      continue;
    }

    // Ligne de paragraphe.
    viderListe();
    paragraphe.push(ligne);
    i++;
  }
  vider();
  return html.join("\n");
}
