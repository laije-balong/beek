// Ecran "tester un exercice" (EM-CON-06). Il lit l'identifiant dans l'adresse,
// recupere la projection publique, affiche l'enonce et la zone de reponse selon
// le type, puis corrige. La reponse attendue n'arrive jamais ici. L'explication
// n'est demandee qu'apres trois reponses fausses (section 4.3). Le rendu des zones
// de reponse vient de l'ilot partage ILOT_ZONES_REPONSE.
import { ILOT_ZONES_REPONSE } from "./ilot-zones-reponse";

export const PAGE_EXERCICE = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beek, tester un exercice</title>
<style>
body{font-family:system-ui,sans-serif;margin:1.5rem;max-width:40rem}
#enonce{background:#f7f7f7;padding:.8rem;border-radius:.3rem}
#enonce h2{font-size:1.15rem;margin:.4rem 0}
#enonce h3{font-size:1rem;margin:.4rem 0}
#enonce table{border-collapse:collapse;margin:.5rem 0}
#enonce th,#enonce td{border:1px solid #bbb;padding:.3rem .5rem;text-align:center}
#enonce code{font-family:ui-monospace,Consolas,monospace;background:#eee;padding:0 .2rem;border-radius:.2rem}
.code,#enonce pre.code{font-family:ui-monospace,Consolas,monospace;white-space:pre;background:#eee;padding:.5rem;border-radius:.3rem;overflow-x:auto}
.zone{margin:1rem 0}
.element{border:1px solid #ccc;padding:.4rem;margin:.3rem 0;display:flex;justify-content:space-between;align-items:center}
.symboles button{margin-right:.3rem;font-family:ui-monospace,monospace}
input[type=text]{padding:.3rem}
label{display:block;margin:.3rem 0}
button{padding:.4rem .8rem}
#resultat{padding:.6rem;margin-top:1rem;min-height:1.4rem;border-radius:.3rem}
.juste{background:#e3f6e3}
.faux{background:#fbe6e6}
a{display:inline-block;margin-bottom:1rem}
</style>
</head>
<body>
<a href="/formateur">Retour a l'espace formateur</a>
<h1 id="titre">Chargement...</h1>
<div id="enonce"></div>
<div id="zone" class="zone"></div>
<button id="btnValider">Valider</button>
<div id="resultat"></div>
<div id="apresTrois"></div>

<script>
${ILOT_ZONES_REPONSE}
var id = new URLSearchParams(location.search).get('id');
var ex = null;
var echecs = 0;
var lireSoumission = null;

async function charger(){
  var r=await fetch('/exercices/'+encodeURIComponent(id)+'/public');
  if(r.status!==200){document.getElementById('titre').textContent='Exercice introuvable.';return;}
  ex=await r.json();
  document.getElementById('titre').textContent=ex.titre;
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
  if(!rendu){zone.textContent='Ce type ('+ex.contenu.type+') n\\'est pas encore affiche.';document.getElementById('btnValider').style.display='none';return;}
  lireSoumission=rendu(ex.contenu,zone);
}
charger();

document.getElementById('btnValider').onclick=async function(){
  if(!lireSoumission)return;
  var r=await fetch('/exercices/'+encodeURIComponent(id)+'/reponse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(lireSoumission())});
  var d=await r.json();
  var res=document.getElementById('resultat');
  if(d.juste){res.className='juste';res.textContent='Juste !';return;}
  echecs++;
  res.className='faux';res.textContent='Faux. Indice : '+(d.indice||'')+' (tentative '+echecs+')';
  if(echecs>=3 && !document.getElementById('btnExpli')){
    var b=creer('button','Voir l\\'explication');b.id='btnExpli';
    b.onclick=async function(){
      var e=await (await fetch('/exercices/'+encodeURIComponent(id)+'/explication')).json();
      document.getElementById('apresTrois').textContent='Explication : '+e.explication;
    };
    document.getElementById('apresTrois').appendChild(b);
  }
};
</script>
</body>
</html>`;
