// Ecran d'exercice de l'apprenant (E-05). Il lit l'element dans l'adresse, l'ouvre
// (transition 7), affiche l'enonce et la zone de reponse selon le type, puis pilote
// le flux UC-05 : indice et compteur de tentatives sur reponse fausse (A1),
// explication apres trois fausses avec confirmation sans XP (A2, A3, PS-04),
// reussite et retour au programme, reouverture en lecture seule (A11, PS-05).
// La reponse attendue n'arrive jamais ici (EM-EXE-03, critere 7). La fidelite
// visuelle aux maquettes et les commentaires viennent dans des incrementts dedies.
import { ILOT_ZONES_REPONSE } from "./ilot-zones-reponse";

export const PAGE_EXERCICE_APPRENANT = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beek, exercice</title>
<style>
body{font-family:system-ui,sans-serif;margin:1.5rem;max-width:40rem}
#bandeau{background:#eef3f8;border:1px solid #cfe0ef;padding:.5rem .7rem;border-radius:.3rem;font-size:.9rem;color:#355}
#enonce{background:#f7f7f7;padding:.8rem;border-radius:.3rem}
#enonce h2{font-size:1.15rem;margin:.4rem 0}
#enonce h3{font-size:1rem;margin:.4rem 0}
#enonce table{border-collapse:collapse;margin:.5rem 0}
#enonce th,#enonce td{border:1px solid #bbb;padding:.3rem .5rem;text-align:center}
#enonce code{font-family:ui-monospace,Consolas,monospace;background:#eee;padding:0 .2rem;border-radius:.2rem}
.code,#enonce pre.code{font-family:ui-monospace,Consolas,monospace;white-space:pre;background:#eee;padding:.5rem;border-radius:.3rem;overflow-x:auto}
.meta{color:#555;margin:.2rem 0 .8rem}
.zone{margin:1rem 0}
.element{border:1px solid #ccc;padding:.4rem;margin:.3rem 0;display:flex;justify-content:space-between;align-items:center}
.symboles button{margin-right:.3rem;font-family:ui-monospace,monospace}
input[type=text]{padding:.3rem}
label{display:block;margin:.3rem 0}
button{padding:.4rem .8rem}
#indice{background:#fff6e5;border:1px solid #f0d08a;padding:.6rem;border-radius:.3rem;margin:.6rem 0}
#compteur{color:#9a2222;margin:.4rem 0}
.hint{color:#666;font-size:.9rem}
.carte{padding:.8rem;border-radius:.3rem;margin-top:1rem}
.reussite{background:#e3f6e3;border:1px solid #9fd6a0}
.explication{background:#f2f2f2;border:1px solid #ccc}
.termine{color:#555;margin-top:.6rem}
a{display:inline-block;margin-bottom:1rem}
#masque{position:fixed;inset:0;background:rgba(0,0,0,.4);display:none;align-items:center;justify-content:center}
#dialogue{background:#fff;padding:1.2rem;border-radius:.5rem;max-width:26rem}
#dialogue h2{margin:.2rem 0 .6rem;font-size:1.1rem}
#dialogue .actions{display:flex;gap:.6rem;justify-content:flex-end;margin-top:1rem}
</style>
</head>
<body>
<a href="/tableau-de-bord">Retour au tableau de bord</a>
<div id="bandeau">Votre activite sur cet exercice est enregistree : reponses et temps passe.</div>
<h1 id="titre">Chargement...</h1>
<p id="meta" class="meta"></p>
<div id="enonce"></div>
<div id="zone" class="zone"></div>
<div id="indice" hidden></div>
<div id="compteur"></div>
<button id="btnValider">Valider</button>
<div id="apres"></div>

<div id="masque">
  <div id="dialogue" role="dialog" aria-modal="true">
    <h2>Voir l'explication ?</h2>
    <p>L'exercice sera valide sans XP. Continuer ?</p>
    <p class="hint">Vous lirez le raisonnement complet et l'element suivant se debloquera. Vous ne pourrez plus repondre a cet exercice.</p>
    <div class="actions">
      <button id="btnAnnuler">Annuler</button>
      <button id="btnVoir">Voir l'explication</button>
    </div>
  </div>
</div>

<script>
${ILOT_ZONES_REPONSE}

var LIBELLES={
  'en-cours':'En cours','disponible':'Disponible','verrouille':'Verrouille',
  'reussi':'Reussi','reussi-avec-explication':'Reussi avec explication',
  'passe-par-le-formateur':'Passe par le formateur'
};
var TERMINE=['reussi','reussi-avec-explication','passe-par-le-formateur'];

var elementId=new URLSearchParams(location.search).get('element');
var lireSoumission=null;
var collageAutorise=true;

function base(chemin){return '/apprenant/elements/'+encodeURIComponent(elementId)+chemin;}

function verrouillerZone(){
  document.getElementById('btnValider').style.display='none';
  document.getElementById('zone').querySelectorAll('input,select,textarea,button').forEach(function(e){e.disabled=true;});
}

function afficherEnonce(ex){
  document.getElementById('titre').textContent=ex.identifiant+' . '+ex.titre;
  document.getElementById('meta').textContent='Exercice . Duree indicative : '+ex.dureeMinutes+' min';
  // enonceHtml est produit et echappe par le serveur (voir enonce.ts).
  document.getElementById('enonce').innerHTML=ex.enonceHtml;
  if(ex.images && ex.images.length){
    ex.images.forEach(function(img){
      var im=document.createElement('img');im.src='/images/'+encodeURIComponent(img.cle);
      im.alt=img.texteAlternatif||'';im.style.maxWidth='100%';im.style.marginTop='.5rem';
      document.getElementById('enonce').appendChild(im);
    });
  }
  var zone=document.getElementById('zone');
  var rendu=rendus[ex.contenu.type];
  if(!rendu){zone.textContent='Ce type ('+ex.contenu.type+') n\\'est pas encore affiche.';verrouillerZone();return;}
  lireSoumission=rendu(ex.contenu,zone);
  collageAutorise=ex.collageAutorise;
  if(!collageAutorise){
    zone.addEventListener('paste',function(e){
      e.preventDefault();
      afficherIndice('Le collage est desactive pour cet exercice.');
    });
  }
}

function afficherIndice(texte){
  var z=document.getElementById('indice');z.textContent=texte;z.hidden=false;
}

function majCompteur(tentatives,explicationDisponible){
  var c=document.getElementById('compteur');
  if(tentatives>0){c.textContent='Reponse incorrecte . '+tentatives+' reponse(s) fausse(s).';}
  var apres=document.getElementById('apres');apres.innerHTML='';
  if(explicationDisponible){
    var b=creer('button','Voir l\\'explication');b.id='btnExpli';
    b.onclick=function(){document.getElementById('masque').style.display='flex';};
    apres.appendChild(b);
  }else if(tentatives>0){
    apres.appendChild(creer('p','L\\'explication detaillee devient accessible apres 3 reponses fausses.')).className='hint';
  }
}

function afficherReussite(){
  verrouillerZone();
  document.getElementById('indice').hidden=true;
  document.getElementById('compteur').textContent='';
  var carte=creer('div');carte.className='carte reussite';
  carte.appendChild(creer('h2','Bonne reponse.'));
  carte.appendChild(creer('p','Exercice reussi. L\\'element suivant est debloque.'));
  var b=creer('button','Continuer');b.onclick=function(){location.href='/tableau-de-bord';};
  carte.appendChild(b);
  var apres=document.getElementById('apres');apres.innerHTML='';apres.appendChild(carte);
}

function afficherExplication(texte){
  verrouillerZone();
  document.getElementById('indice').hidden=true;
  document.getElementById('compteur').textContent='';
  var apres=document.getElementById('apres');apres.innerHTML='';
  var carte=creer('div');carte.className='carte explication';
  carte.appendChild(creer('h2','Explication detaillee'));
  carte.appendChild(creer('p',texte));
  apres.appendChild(carte);
  apres.appendChild(creer('p','Exercice termine : lecture seule. Aucune nouvelle tentative n\\'est possible.')).className='termine';
  var b=creer('button','Revenir au tableau de bord');b.onclick=function(){location.href='/tableau-de-bord';};
  apres.appendChild(b);
}

async function ouvrir(){
  var r=await fetch(base('/ouvrir'),{method:'POST'});
  if(r.status!==200){document.getElementById('titre').textContent='Exercice indisponible.';document.getElementById('btnValider').style.display='none';return;}
  var d=await r.json();
  afficherEnonce(d.exercice);
  document.getElementById('meta').textContent+=' . '+(LIBELLES[d.statut]||d.statut);
  if(TERMINE.indexOf(d.statut)>=0){
    // Reouverture en lecture seule (A11, PS-05).
    if(d.explication){afficherExplication(d.explication);}
    else{verrouillerZone();document.getElementById('apres').appendChild(creer('p','Exercice termine : lecture seule.')).className='termine';}
    return;
  }
  majCompteur(d.tentatives,d.explicationDisponible);
}
ouvrir();

document.getElementById('btnValider').onclick=async function(){
  if(!lireSoumission)return;
  var r=await fetch(base('/reponse'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(lireSoumission())});
  if(r.status!==200)return;
  var d=await r.json();
  if(d.juste){afficherReussite();return;}
  afficherIndice('Indice : '+(d.indice||''));
  majCompteur(d.tentatives,d.explicationDisponible);
};

document.getElementById('btnAnnuler').onclick=function(){document.getElementById('masque').style.display='none';};
document.getElementById('btnVoir').onclick=async function(){
  document.getElementById('masque').style.display='none';
  var r=await fetch(base('/explication'),{method:'POST'});
  if(r.status!==200)return;
  var d=await r.json();
  afficherExplication(d.explication);
};
</script>
</body>
</html>`;
