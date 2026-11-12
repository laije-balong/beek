// Tableau de bord de l'apprenant (E-03). Il liste ses programmes et le statut de
// chaque element. Un element verrouille ne s'ouvre pas. Faire l'exercice viendra
// avec l'ecran d'exercice de l'apprenant.
export const PAGE_TABLEAU_DE_BORD = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beek, mes programmes</title>
<style>
body{font-family:system-ui,sans-serif;margin:1.5rem;max-width:40rem}
.programme{border:1px solid #ccc;border-radius:.3rem;padding:1rem;margin-bottom:1rem}
.programme h2{margin:.2rem 0;font-size:1.15rem}
.filrouge{color:#555;margin:.2rem 0 .6rem}
.element{display:flex;justify-content:space-between;padding:.4rem;border-top:1px solid #eee}
.statut{font-weight:bold}
.verrouille{color:#999}
.disponible{color:#1a7f37}
.en-cours{color:#9a6700}
.reussi,.reussi-avec-explication{color:#1a7f37}
.passe-par-le-formateur{color:#555}
button{padding:.4rem .8rem}
</style>
</head>
<body>
<h1 id="titre">Mes programmes</h1>
<p id="message"></p>
<div id="programmes"></div>
<button id="btnDeco">Se deconnecter</button>

<script>
var LIBELLES = {
  'verrouille':'Verrouillé',
  'disponible':'Disponible',
  'en-cours':'En cours',
  'reussi':'Réussi',
  'reussi-avec-explication':'Réussi (avec explication)',
  'passe-par-le-formateur':'Passé par le formateur'
};
function creer(b,t){var e=document.createElement(b);if(t!==undefined)e.textContent=t;return e;}

async function charger(){
  var r=await fetch('/moi');
  if(r.status!==200){location.href='/';return;}
  var moi=await r.json();
  document.getElementById('titre').textContent='Mes programmes, '+moi.nom;
  var progs=await (await fetch('/mes-programmes')).json();
  var zone=document.getElementById('programmes');
  if(!progs.length){document.getElementById('message').textContent='Aucun programme attribue pour le moment.';return;}
  progs.forEach(function(p){
    var bloc=creer('div');bloc.className='programme';
    bloc.appendChild(creer('h2',p.nom));
    bloc.appendChild((function(){var d=creer('div');d.className='filrouge';d.textContent=(p.filiereNom||'')+(p.filRougeNom?(' | Fil rouge : '+p.filRougeNom):'');return d;})());
    p.elements.forEach(function(el){
      var ligne=creer('div');ligne.className='element';
      ligne.appendChild(creer('span',el.titre+' ('+el.type+')'));
      var s=creer('span',LIBELLES[el.statut]||el.statut);s.className='statut '+el.statut;
      ligne.appendChild(s);bloc.appendChild(ligne);
    });
    zone.appendChild(bloc);
  });
}
charger();

document.getElementById('btnDeco').onclick=async function(){
  await fetch('/auth/deconnexion',{method:'POST'});
  location.href='/';
};
</script>
</body>
</html>`;
