// Page de test de l'inscription et de la connexion. Le hachage lent PBKDF2 a
// 600 000 iterations se fait ici, dans le navigateur. Le serveur ne recoit que
// le resultat. Cette page sert aux premiers essais de bout en bout.
export const PAGE_CONNEXION = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beek, connexion</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;max-width:34rem}
fieldset{margin-bottom:1.2rem;border:1px solid #ccc;padding:1rem}
legend{font-weight:bold}
label{display:block;margin:.5rem 0 .1rem}
input[type=text],input[type=password]{width:100%;padding:.4rem;box-sizing:border-box}
button{margin-top:.7rem;padding:.5rem 1rem}
#resultat{padding:.6rem;background:#f3f3f3;min-height:1.4rem}
</style>
</head>
<body>
<h1>Beek</h1>
<p id="resultat">Pret.</p>

<fieldset>
<legend>Compte de test</legend>
<label>Adresse</label><input type="text" id="t-email" value="test@beek.local">
<button id="btnTest">Creer un apprenant de test</button>
<button id="btnTestF">Creer un formateur de test</button>
</fieldset>

<fieldset>
<legend>Activation</legend>
<label>Adresse</label><input type="text" id="a-email" value="test@beek.local">
<label>Mot de passe temporaire</label><input type="text" id="a-temp">
<label>Nouveau mot de passe</label><input type="password" id="a-mdp">
<label><input type="checkbox" id="a-seize"> J'ai 16 ans ou plus</label>
<label><input type="checkbox" id="a-donnees"> J'accepte le traitement de mes donnees</label>
<button id="btnActiver">Activer</button>
</fieldset>

<fieldset>
<legend>Connexion</legend>
<label>Adresse</label><input type="text" id="c-email" value="test@beek.local">
<label>Mot de passe</label><input type="password" id="c-mdp">
<button id="btnConnexion">Se connecter</button>
</fieldset>

<fieldset>
<legend>Session</legend>
<button id="btnMoi">Qui suis-je</button>
<button id="btnDeco">Se deconnecter</button>
</fieldset>

<fieldset>
<legend>Formateur : creer un apprenant</legend>
<label>Nom</label><input type="text" id="f-nom" value="Apprenant">
<label>Adresse</label><input type="text" id="f-email" value="eleve@beek.local">
<button id="btnFcreer">Creer l'apprenant</button>
</fieldset>

<script>
function hex(a){var s='';for(var i=0;i<a.length;i++)s+=a[i].toString(16).padStart(2,'0');return s;}
function fromHex(h){var o=new Uint8Array(h.length/2);for(var i=0;i<o.length;i++)o[i]=parseInt(h.slice(i*2,i*2+2),16);return o;}
function afficher(t){document.getElementById('resultat').textContent=t;}
async function selPour(email){var r=await fetch('/auth/sel?email='+encodeURIComponent(email));var d=await r.json();return fromHex(d.selHex);}
async function pbkdf2(mdp,sel){var km=await crypto.subtle.importKey('raw',new TextEncoder().encode(mdp),'PBKDF2',false,['deriveBits']);var bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:sel,iterations:600000,hash:'SHA-256'},km,256);return hex(new Uint8Array(bits));}

document.getElementById('btnTest').onclick=async function(){
  afficher('Creation...');
  var email=document.getElementById('t-email').value;
  var r=await fetch('/dev/creer-apprenant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email,nom:'Test'})});
  var d=await r.json();
  if(d.motDePasseTemporaire){document.getElementById('a-email').value=email;afficher('Compte '+email+' cree. Mot de passe temporaire : '+d.motDePasseTemporaire);}else{afficher('Erreur : '+d.erreur);}
};

document.getElementById('btnActiver').onclick=async function(){
  try{
    afficher('Activation...');
    var email=document.getElementById('a-email').value;
    var sel=await selPour(email);
    var resultatHex=await pbkdf2(document.getElementById('a-mdp').value,sel);
    var r=await fetch('/auth/activation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email,motDePasseTemporaire:document.getElementById('a-temp').value,resultatHex:resultatHex,seizeAns:document.getElementById('a-seize').checked,traitementDonnees:document.getElementById('a-donnees').checked})});
    var d=await r.json();
    if(d.ok){document.getElementById('c-email').value=email;document.getElementById('c-mdp').value=document.getElementById('a-mdp').value;afficher('Compte active. Les champs de connexion sont pre-remplis, cliquez sur Se connecter.');}else{afficher('Erreur : '+d.erreur);}
  }catch(e){afficher('Erreur : '+e);}
};

document.getElementById('btnConnexion').onclick=async function(){
  try{
    afficher('Connexion...');
    var email=document.getElementById('c-email').value;
    var sel=await selPour(email);
    var resultatHex=await pbkdf2(document.getElementById('c-mdp').value,sel);
    var r=await fetch('/auth/connexion',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email,resultatHex:resultatHex})});
    var d=await r.json();
    afficher(d.ok?('Connexion reussie, bonjour '+d.nom):('Erreur : '+d.erreur));
  }catch(e){afficher('Erreur : '+e);}
};

document.getElementById('btnMoi').onclick=async function(){
  var r=await fetch('/moi');
  if(r.status===200){var d=await r.json();afficher('Connecte : '+d.nom+' ('+d.role+')');}else{afficher('Non connecte.');}
};
document.getElementById('btnDeco').onclick=async function(){
  await fetch('/auth/deconnexion',{method:'POST'});
  afficher('Deconnecte.');
};

document.getElementById('btnTestF').onclick=async function(){
  afficher('Creation...');
  var email=document.getElementById('t-email').value;
  var r=await fetch('/dev/creer-formateur',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email,nom:'Formateur'})});
  var d=await r.json();
  if(d.motDePasseTemporaire){document.getElementById('a-email').value=email;afficher('Formateur '+email+' cree. Mot de passe temporaire : '+d.motDePasseTemporaire);}else{afficher('Erreur : '+d.erreur);}
};

document.getElementById('btnFcreer').onclick=async function(){
  afficher('Creation...');
  var r=await fetch('/formateur/apprenants',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nom:document.getElementById('f-nom').value,email:document.getElementById('f-email').value})});
  var d=await r.json();
  if(d.motDePasseTemporaire){afficher('Apprenant cree. Coupon : '+d.email+' / '+d.motDePasseTemporaire);}else{afficher('Erreur : '+d.erreur);}
};
</script>
</body>
</html>`;
