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

document.getElementById('btnDeco').onclick=async function(){
  await fetch('/auth/deconnexion',{method:'POST'});
  location.href='/';
};
</script>
</body>
</html>`;
