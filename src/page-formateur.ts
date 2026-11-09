// Espace du formateur, rendu par le serveur et protege par la session de role
// formateur. Il porte l'ecran de creation d'un compte E-18 et le coupon
// imprimable E-20 (UC-02 A1). La selection de la classe viendra avec les classes,
// US-04, en iteration 2. Le bouton d'import d'apprenants reste masque en V1 (PS-26).
export const PAGE_FORMATEUR = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beek, espace formateur</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;max-width:34rem}
fieldset{margin-bottom:1.2rem;border:1px solid #ccc;padding:1rem}
legend{font-weight:bold}
label{display:block;margin:.5rem 0 .1rem}
input[type=text]{width:100%;padding:.4rem;box-sizing:border-box}
button{margin-top:.7rem;padding:.5rem 1rem}
#message{padding:.6rem;background:#f3f3f3;min-height:1.4rem}
.coupon{border:2px solid #333;padding:1rem;margin-top:1rem}
.coupon h2{margin-top:0}
.coupon dt{font-weight:bold;margin-top:.4rem}
.avert{color:#a00}
@media print{
  body *{visibility:hidden}
  .coupon,.coupon *{visibility:visible}
  .coupon{position:absolute;left:0;top:0;width:100%}
  .noprint{display:none}
}
</style>
</head>
<body>
<h1>Beek, espace formateur</h1>
<p id="message" class="noprint">Chargement...</p>

<fieldset class="noprint">
<legend>Creer un compte (E-18)</legend>
<label>Nom</label><input type="text" id="nom">
<label>Adresse e-mail</label><input type="text" id="email">
<button id="btnCreer">Creer le compte</button>
</fieldset>

<div id="zoneCoupon"></div>

<fieldset class="noprint">
<legend>Codes de secours (EM-ACC-13)</legend>
<p id="restants"></p>
<button id="btnCodes">Regenerer les 5 codes</button>
<div id="zoneCodes"></div>
</fieldset>

<fieldset class="noprint">
<legend>Taxonomie du contenu (US-05)</legend>
<label>Nouveau domaine</label>
<input type="text" id="d-nom"><button id="btnDomaine">Creer le domaine</button>
<label>Domaine</label><select id="sel-domaine"></select>
<label>Nouvelle filiere dans ce domaine</label>
<input type="text" id="f-nom2"><button id="btnFiliere">Creer la filiere</button>
<label>Filiere</label><select id="sel-filiere"></select>
<label>Niveau</label><select id="sel-niveau"></select>
<label>Nouvelle notion a ce niveau</label>
<input type="text" id="n-nom"><button id="btnNotion">Creer la notion</button>
<ul id="liste-notions"></ul>
</fieldset>

<fieldset class="noprint">
<legend>Fils rouges (US-06)</legend>
<label>Nom</label><input type="text" id="fr-nom">
<label>Description</label><input type="text" id="fr-desc">
<button id="btnFilRouge">Creer le fil rouge</button>
<ul id="liste-fils-rouges"></ul>
</fieldset>

<fieldset class="noprint">
<legend>Images (Workers KV)</legend>
<input type="file" id="img-fichier" accept="image/png,image/webp,image/svg+xml">
<label>Texte alternatif</label><input type="text" id="img-alt">
<button id="btnImage">Envoyer l'image</button>
<p id="img-etat"></p>
<div id="img-apercu"></div>
</fieldset>

<fieldset class="noprint">
<legend>Exercices (recette)</legend>
<button id="btnRecette">Charger les exercices de la recette</button>
<p id="recette-etat"></p>
<ul id="liste-exercices"></ul>
</fieldset>

<fieldset class="noprint">
<legend>Session</legend>
<button id="btnDeco">Se deconnecter</button>
</fieldset>

<script>
function fmtDate(ms){if(!ms)return '';return new Date(ms).toLocaleString('fr-FR');}
function ligne(dl,terme,valeur){var dt=document.createElement('dt');dt.textContent=terme;var dd=document.createElement('dd');dd.textContent=valeur;dl.appendChild(dt);dl.appendChild(dd);}

async function qui(){
  var r=await fetch('/moi');
  if(r.status!==200){location.href='/';return;}
  var d=await r.json();
  document.getElementById('message').textContent='Connecte : '+d.nom+' ('+d.role+')';
  if(typeof d.codesSecoursRestants==='number'){document.getElementById('restants').textContent='Codes de secours restants : '+d.codesSecoursRestants;}
}
qui();

document.getElementById('btnCreer').onclick=async function(){
  document.getElementById('message').textContent='Creation...';
  var r=await fetch('/formateur/apprenants',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nom:document.getElementById('nom').value,email:document.getElementById('email').value})});
  var d=await r.json();
  var zone=document.getElementById('zoneCoupon');
  if(!d.motDePasseTemporaire){document.getElementById('message').textContent='Erreur : '+d.erreur;zone.innerHTML='';return;}
  document.getElementById('message').textContent='Compte cree au statut en attente d activation.';
  var box=document.createElement('div');box.className='coupon';
  var h=document.createElement('h2');h.textContent='Coupon Beek (E-20)';box.appendChild(h);
  var dl=document.createElement('dl');
  ligne(dl,'Nom',d.nom);
  ligne(dl,'Adresse e-mail',d.email);
  ligne(dl,'Mot de passe temporaire',d.motDePasseTemporaire);
  ligne(dl,'Adresse du site',d.site);
  ligne(dl,'Expire le',fmtDate(d.expirationMs));
  box.appendChild(dl);
  var av=document.createElement('p');av.className='avert';av.textContent='Imprimez ce coupon maintenant. Le mot de passe ne sera plus affichable ensuite.';box.appendChild(av);
  var bi=document.createElement('button');bi.className='noprint';bi.textContent='Imprimer';bi.onclick=function(){window.print();};box.appendChild(bi);
  zone.innerHTML='';zone.appendChild(box);
  document.getElementById('nom').value='';document.getElementById('email').value='';
};

document.getElementById('btnCodes').onclick=async function(){
  if(!confirm('Regenerer les codes rend les anciens caducs. Continuer ?'))return;
  var r=await fetch('/formateur/codes-secours',{method:'POST'});
  var d=await r.json();
  var z=document.getElementById('zoneCodes');z.innerHTML='';
  if(!d.codesDeSecours){document.getElementById('message').textContent='Erreur : '+d.erreur;return;}
  var box=document.createElement('div');box.className='coupon';
  var h=document.createElement('h2');h.textContent='Codes de secours (a imprimer)';box.appendChild(h);
  var ul=document.createElement('ul');
  d.codesDeSecours.forEach(function(code){var li=document.createElement('li');li.textContent=code;ul.appendChild(li);});
  box.appendChild(ul);
  var av=document.createElement('p');av.className='avert';av.textContent='Imprimez ces codes maintenant. Ils ne seront plus affichables ensuite.';box.appendChild(av);
  var bi=document.createElement('button');bi.className='noprint';bi.textContent='Imprimer';bi.onclick=function(){window.print();};box.appendChild(bi);
  z.appendChild(box);
  document.getElementById('restants').textContent='Codes de secours restants : '+d.codesDeSecours.length;
};

// Taxonomie du contenu (US-05).
function option(valeur,texte){var o=document.createElement('option');o.value=valeur;o.textContent=texte;return o;}
function remplir(sel,elements,garderValeur){var avant=sel.value;sel.innerHTML='';elements.forEach(function(e){sel.appendChild(option(e.id,e.nom));});if(garderValeur&&elements.some(function(e){return e.id===avant;}))sel.value=avant;}

async function chargerDomaines(selId){
  var d=await (await fetch('/formateur/domaines')).json();
  remplir(document.getElementById('sel-domaine'),d,false);
  if(selId)document.getElementById('sel-domaine').value=selId;
  await chargerFilieres();
}
async function chargerFilieres(selId){
  var dom=document.getElementById('sel-domaine').value;
  var f=dom?await (await fetch('/formateur/filieres?domaineId='+encodeURIComponent(dom))).json():[];
  remplir(document.getElementById('sel-filiere'),f,false);
  if(selId)document.getElementById('sel-filiere').value=selId;
  await chargerNiveaux();
}
async function chargerNiveaux(){
  var fil=document.getElementById('sel-filiere').value;
  var n=fil?await (await fetch('/formateur/niveaux?filiereId='+encodeURIComponent(fil))).json():[];
  remplir(document.getElementById('sel-niveau'),n,false);
  await chargerNotions();
}
async function chargerNotions(){
  var niv=document.getElementById('sel-niveau').value;
  var ul=document.getElementById('liste-notions');ul.innerHTML='';
  if(!niv)return;
  var liste=await (await fetch('/formateur/notions?niveauId='+encodeURIComponent(niv))).json();
  liste.forEach(function(no){
    var li=document.createElement('li');li.textContent=no.nom+' ';
    var b=document.createElement('button');b.textContent='Supprimer';
    b.onclick=async function(){
      var r=await fetch('/formateur/notions/'+no.id,{method:'DELETE'});
      if(r.status!==200){var e=await r.json();document.getElementById('message').textContent='Erreur : '+e.erreur;return;}
      await chargerNotions();
    };
    li.appendChild(b);ul.appendChild(li);
  });
}

document.getElementById('sel-domaine').onchange=function(){chargerFilieres();};
document.getElementById('sel-filiere').onchange=function(){chargerNiveaux();};
document.getElementById('sel-niveau').onchange=function(){chargerNotions();};

document.getElementById('btnDomaine').onclick=async function(){
  var r=await fetch('/formateur/domaines',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nom:document.getElementById('d-nom').value})});
  var d=await r.json();
  if(r.status!==200){document.getElementById('message').textContent='Erreur : '+d.erreur;return;}
  document.getElementById('d-nom').value='';
  await chargerDomaines(d.id);
};
document.getElementById('btnFiliere').onclick=async function(){
  var r=await fetch('/formateur/filieres',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({domaineId:document.getElementById('sel-domaine').value,nom:document.getElementById('f-nom2').value})});
  var d=await r.json();
  if(r.status!==200){document.getElementById('message').textContent='Erreur : '+d.erreur;return;}
  document.getElementById('f-nom2').value='';
  await chargerFilieres(d.filiere.id);
};
document.getElementById('btnNotion').onclick=async function(){
  var r=await fetch('/formateur/notions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({niveauId:document.getElementById('sel-niveau').value,nom:document.getElementById('n-nom').value})});
  var d=await r.json();
  if(r.status!==200){document.getElementById('message').textContent='Erreur : '+d.erreur;return;}
  document.getElementById('n-nom').value='';
  await chargerNotions();
};

chargerDomaines();

// Fils rouges (US-06).
async function chargerFilsRouges(){
  var liste=await (await fetch('/formateur/fils-rouges')).json();
  var ul=document.getElementById('liste-fils-rouges');ul.innerHTML='';
  liste.forEach(function(fr){
    var li=document.createElement('li');li.textContent=fr.nom+(fr.description?(' : '+fr.description):'')+' ';
    var b=document.createElement('button');b.textContent='Supprimer';
    b.onclick=async function(){
      var r=await fetch('/formateur/fils-rouges/'+fr.id,{method:'DELETE'});
      if(r.status!==200){var e=await r.json();document.getElementById('message').textContent='Erreur : '+e.erreur;return;}
      await chargerFilsRouges();
    };
    li.appendChild(b);ul.appendChild(li);
  });
}
document.getElementById('btnFilRouge').onclick=async function(){
  var r=await fetch('/formateur/fils-rouges',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nom:document.getElementById('fr-nom').value,description:document.getElementById('fr-desc').value})});
  var d=await r.json();
  if(r.status!==200){document.getElementById('message').textContent='Erreur : '+d.erreur;return;}
  document.getElementById('fr-nom').value='';document.getElementById('fr-desc').value='';
  await chargerFilsRouges();
};
chargerFilsRouges();

// Exercices de la recette.
async function chargerListeExercices(){
  var liste=await (await fetch('/formateur/exercices')).json();
  var ul=document.getElementById('liste-exercices');ul.innerHTML='';
  liste.forEach(function(e){
    var li=document.createElement('li');
    var a=document.createElement('a');a.href='/test-exercice?id='+encodeURIComponent(e.identifiant);
    a.textContent=e.identifiant+' ('+e.type+') : '+e.titre;
    li.appendChild(a);ul.appendChild(li);
  });
}
document.getElementById('btnRecette').onclick=async function(){
  document.getElementById('recette-etat').textContent='Chargement...';
  var r=await fetch('/formateur/charger-recette',{method:'POST'});
  var d=await r.json();
  var msg='Charges : '+d.charges.length;
  if(d.erreurs&&d.erreurs.length)msg+=' | Erreurs : '+d.erreurs.join(' ; ');
  document.getElementById('recette-etat').textContent=msg;
  await chargerListeExercices();
};
chargerListeExercices();

document.getElementById('btnImage').onclick=async function(){
  var f=document.getElementById('img-fichier').files[0];
  if(!f){document.getElementById('img-etat').textContent='Choisissez un fichier.';return;}
  var fmt=f.type.indexOf('svg')>=0?'svg':f.type.indexOf('png')>=0?'png':f.type.indexOf('webp')>=0?'webp':'';
  var buf=await f.arrayBuffer();
  var r=await fetch('/formateur/images?format='+fmt+'&alt='+encodeURIComponent(document.getElementById('img-alt').value),{method:'POST',body:buf});
  var d=await r.json();
  if(!d.cle){document.getElementById('img-etat').textContent='Erreur : '+d.erreur;return;}
  document.getElementById('img-etat').textContent='Image rangee : '+d.cle+' ('+d.octets+' octets)';
  var im=document.createElement('img');im.src='/images/'+d.cle;im.alt=d.texteAlternatif||'';im.style.maxWidth='12rem';im.style.display='block';im.style.marginTop='.5rem';
  var z=document.getElementById('img-apercu');z.innerHTML='';z.appendChild(im);
};

document.getElementById('btnDeco').onclick=async function(){
  await fetch('/auth/deconnexion',{method:'POST'});
  location.href='/';
};
</script>
</body>
</html>`;
