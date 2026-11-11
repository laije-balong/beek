// Ecran de composition d'un programme (US-07), reserve au formateur. Il cree un
// programme dans une filiere avec un fil rouge au plus, ajoute des exercices
// depuis la liste des ajoutables, les reordonne et les retire.
export const PAGE_PROGRAMMES = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beek, composer un programme</title>
<style>
body{font-family:system-ui,sans-serif;margin:1.5rem;max-width:40rem}
fieldset{margin-bottom:1.2rem;border:1px solid #ccc;padding:1rem}
legend{font-weight:bold}
label{display:block;margin:.5rem 0 .1rem}
input[type=text],select{width:100%;padding:.4rem;box-sizing:border-box}
button{margin-top:.5rem;padding:.4rem .8rem}
.element{border:1px solid #ccc;padding:.4rem;margin:.3rem 0;display:flex;justify-content:space-between;align-items:center;gap:.5rem}
#message{padding:.6rem;background:#f3f3f3;min-height:1.4rem}
a{display:inline-block;margin-bottom:1rem}
</style>
</head>
<body>
<a href="/formateur">Retour a l'espace formateur</a>
<h1>Composer un programme</h1>
<p id="message">Pret.</p>

<fieldset>
<legend>Nouveau programme</legend>
<label>Nom</label><input type="text" id="p-nom">
<label>Filiere</label><select id="p-filiere"></select>
<label>Fil rouge</label><select id="p-fr"></select>
<button id="btnCreer">Creer le programme</button>
</fieldset>

<fieldset>
<legend>Programme</legend>
<select id="sel-programme"></select>
<p id="detail-entete"></p>
<h3>Elements</h3>
<div id="elements"></div>
<h3>Exercices ajoutables</h3>
<div id="ajoutables"></div>
</fieldset>

<script>
function creer(b,t){var e=document.createElement(b);if(t!==undefined)e.textContent=t;return e;}
function afficher(t){document.getElementById('message').textContent=t;}
function option(v,t){var o=creer('option',t);o.value=v;return o;}

async function chargerFilieres(){
  var f=await (await fetch('/formateur/filieres-toutes')).json();
  var sel=document.getElementById('p-filiere');sel.innerHTML='';
  f.forEach(function(x){sel.appendChild(option(x.id,x.nom));});
}
async function chargerFilsRouges(){
  var fr=await (await fetch('/formateur/fils-rouges')).json();
  var sel=document.getElementById('p-fr');sel.innerHTML='';
  sel.appendChild(option('','(aucun)'));
  fr.forEach(function(x){sel.appendChild(option(x.id,x.nom));});
}
async function chargerProgrammes(selId){
  var p=await (await fetch('/formateur/programmes')).json();
  var sel=document.getElementById('sel-programme');sel.innerHTML='';
  sel.appendChild(option('','(choisir un programme)'));
  p.forEach(function(x){sel.appendChild(option(x.id,x.nom));});
  if(selId)sel.value=selId;
  await chargerDetail();
}

async function chargerDetail(){
  var id=document.getElementById('sel-programme').value;
  var elz=document.getElementById('elements');var ajz=document.getElementById('ajoutables');
  elz.innerHTML='';ajz.innerHTML='';document.getElementById('detail-entete').textContent='';
  if(!id)return;
  var d=await (await fetch('/formateur/programmes/'+encodeURIComponent(id))).json();
  document.getElementById('detail-entete').textContent='Filiere : '+(d.filiereNom||'?')+(d.filRougeNom?(' | Fil rouge : '+d.filRougeNom):' | Sans fil rouge');
  var ids=d.elements.map(function(e){return e.id;});
  d.elements.forEach(function(el,i){
    var ligne=creer('div');ligne.className='element';
    ligne.appendChild(creer('span',(i+1)+'. '+el.titre+' ('+el.type+')'));
    var btns=creer('span');
    var haut=creer('button','▲');haut.disabled=i===0;
    haut.onclick=function(){var o=ids.slice();var t=o[i-1];o[i-1]=o[i];o[i]=t;reordonner(id,o);};
    var bas=creer('button','▼');bas.disabled=i===d.elements.length-1;
    bas.onclick=function(){var o=ids.slice();var t=o[i+1];o[i+1]=o[i];o[i]=t;reordonner(id,o);};
    var sup=creer('button','Retirer');
    sup.onclick=async function(){await fetch('/formateur/programmes/elements/'+el.id,{method:'DELETE'});await chargerDetail();};
    btns.appendChild(haut);btns.appendChild(bas);btns.appendChild(sup);ligne.appendChild(btns);elz.appendChild(ligne);
  });
  if(d.elements.length===0)elz.appendChild(creer('p','Aucun element pour l instant.'));
  d.ajoutables.forEach(function(a){
    var ligne=creer('div');ligne.className='element';
    ligne.appendChild(creer('span',a.titre+' ('+a.type+')'));
    var b=creer('button','Ajouter');
    b.onclick=async function(){
      var r=await fetch('/formateur/programmes/'+encodeURIComponent(id)+'/elements',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({exerciceIdentifiant:a.identifiant})});
      if(r.status!==200){var e=await r.json();afficher('Erreur : '+e.erreur);return;}
      await chargerDetail();
    };
    ligne.appendChild(b);ajz.appendChild(ligne);
  });
  if(d.ajoutables.length===0)ajz.appendChild(creer('p','Aucun exercice ajoutable.'));
}

async function reordonner(id,ordre){
  var r=await fetch('/formateur/programmes/'+encodeURIComponent(id)+'/ordre',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ordre:ordre})});
  if(r.status!==200){var e=await r.json();afficher('Erreur : '+e.erreur);return;}
  await chargerDetail();
}

document.getElementById('sel-programme').onchange=function(){chargerDetail();};
document.getElementById('btnCreer').onclick=async function(){
  var r=await fetch('/formateur/programmes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nom:document.getElementById('p-nom').value,filiereId:document.getElementById('p-filiere').value,filRougeId:document.getElementById('p-fr').value||null})});
  var d=await r.json();
  if(!d.id){afficher('Erreur : '+d.erreur);return;}
  document.getElementById('p-nom').value='';
  afficher('Programme cree.');
  await chargerProgrammes(d.id);
};

chargerFilieres();chargerFilsRouges();chargerProgrammes();
</script>
</body>
</html>`;
