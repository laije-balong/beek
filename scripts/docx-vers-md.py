#!/usr/bin/env python3
# Convertit un .docx en markdown lecture seule, sans dependance externe. Un .docx
# est un zip contenant word/document.xml. On parcourt les paragraphes et tableaux,
# on repere les titres par leur style, et on rend des listes et des tableaux simples.
import sys
import re
import zipfile
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def texte_paragraphe(p):
    morceaux = []
    for n in p.iter():
        if n.tag == W + "t":
            morceaux.append(n.text or "")
        elif n.tag == W + "tab":
            morceaux.append("\t")
        elif n.tag == W + "br":
            morceaux.append("\n")
    return "".join(morceaux).strip()


def niveau_titre(p):
    ppr = p.find(W + "pPr")
    if ppr is None:
        return None
    style = ppr.find(W + "pStyle")
    if style is None:
        return None
    val = (style.get(W + "val") or "").lower()
    m = re.search(r"(heading|titre|title)(\d+)?", val)
    if not m:
        return None
    num = m.group(2)
    if m.group(1) == "title":
        return 1
    return int(num) if num else 1


def est_liste(p):
    ppr = p.find(W + "pPr")
    return ppr is not None and ppr.find(W + "numPr") is not None


def rendre_tableau(tbl):
    lignes = []
    for tr in tbl.findall(W + "tr"):
        cellules = []
        for tc in tr.findall(W + "tc"):
            textes = [texte_paragraphe(p) for p in tc.findall(W + "p")]
            cellules.append(" ".join(t for t in textes if t).replace("|", "\\|"))
        lignes.append(cellules)
    if not lignes:
        return []
    largeur = max(len(l) for l in lignes)
    lignes = [l + [""] * (largeur - len(l)) for l in lignes]
    sortie = ["| " + " | ".join(lignes[0]) + " |", "| " + " | ".join(["---"] * largeur) + " |"]
    for l in lignes[1:]:
        sortie.append("| " + " | ".join(l) + " |")
    return sortie


def convertir(chemin_docx, titre):
    with zipfile.ZipFile(chemin_docx) as z:
        xml = z.read("word/document.xml")
    corps = ET.fromstring(xml).find(W + "body")
    sortie = ["<!-- Conversion automatique de " + chemin_docx.split("/")[-1] +
              ". Document de reference, lecture seule. L'original .docx fait foi. -->",
              "", "# " + titre, ""]
    for enfant in corps:
        if enfant.tag == W + "p":
            t = texte_paragraphe(enfant)
            if not t:
                continue
            n = niveau_titre(enfant)
            if n:
                sortie.append("\n" + "#" * min(n + 1, 6) + " " + t + "\n")
            elif est_liste(enfant):
                sortie.append("- " + t)
            else:
                sortie.append(t + "\n")
        elif enfant.tag == W + "tbl":
            sortie.append("")
            sortie.extend(rendre_tableau(enfant))
            sortie.append("")
    return "\n".join(sortie).strip() + "\n"


if __name__ == "__main__":
    src, dest, titre = sys.argv[1], sys.argv[2], sys.argv[3]
    with open(dest, "w", encoding="utf-8") as f:
        f.write(convertir(src, titre))
    print("ecrit " + dest)
