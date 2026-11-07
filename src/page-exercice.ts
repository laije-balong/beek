// Ecran "tester un exercice" (EM-CON-06). Il lit l'identifiant dans l'adresse,
// recupere la projection publique, affiche l'enonce et la zone de reponse selon
// le type, puis corrige. La reponse attendue n'arrive jamais ici. L'explication
// n'est demandee qu'apres trois reponses fausses (section 4.3).
export const PAGE_EXERCICE = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beek, tester un exercice</title>
<style>
body{font-family:system-ui,sans-serif;margin:1.5rem;max-width:40rem}
#enonce{white-space:pre-wrap;background:#f7f7f7;padding:.8rem;border-radius:.3rem}
.code{font-family:ui-monospace,Consolas,monospace;white-space:pre}
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
var id = new URLSearchParams(location.search).get('id');
var ex = null;
var echecs = 0;
var dernierChamp = null;

function creer(balise, texte){var e=document.createElement(balise);if(texte!==undefined)e.textContent=texte;return e;}

// Barre de symboles du pseudo-code (point 3.4b).
function barreSymboles(champ){
  var bar=creer('div');bar.className='symboles';
  ['←','≠','≤','≥'].forEach(function(sym){
    var b=creer('button',sym);b.type='button';
    b.onclick=function(){insererDans(champ,sym);};
    bar.appendChild(b);
  });
  return bar;
}
function insererDans(champ,sym){
  var debut=champ.selectionStart||0,fin=champ.selectionEnd||0;
  champ.value=champ.value.slice(0,debut)+sym+champ.value.slice(fin);
  champ.focus();champ.selectionStart=champ.selectionEnd=debut+sym.length;
}
function champTexte(avecSymboles){
  var wrap=creer('div');
  var input=document.createElement('input');input.type='text';
  input.onfocus=function(){dernierChamp=input;};
  wrap.appendChild(input);
  if(avecSymboles)wrap.appendChild(barreSymboles(input));
  return {wrap:wrap,input:input};
}

var rendus = {
  T01:function(c,zone){
    zone.appendChild(creer('p',c.question));
    c.options.forEach(function(opt,i){
      var l=creer('label');var e=document.createElement('input');
      e.type=c.choixMultiple?'checkbox':'radio';e.name='t01';e.value=String(i);
      l.appendChild(e);l.appendChild(document.createTextNode(' '+opt));zone.appendChild(l);
    });
    return function(){
      var coches=[];zone.querySelectorAll('input').forEach(function(e){if(e.checked)coches.push(Number(e.value));});
      return {type:'T01',optionsCochees:coches};
    };
  },
  T02:function(c,zone){
    zone.appendChild(creer('p',c.question));
    var ch=champTexte(true);zone.appendChild(ch.wrap);
    return function(){return {type:'T02',saisie:ch.input.value};};
  },
  T03:function(c,zone){
    zone.appendChild(creer('p',c.consigne));
    var liste=creer('div');var ordre=c.elements.slice();
    function dessiner(){
      liste.innerHTML='';
      ordre.forEach(function(el,i){
        var ligne=creer('div');ligne.className='element';
        ligne.appendChild(creer('span',el.texte));
        var btns=creer('span');
        var haut=creer('button','▲');haut.type='button';haut.disabled=i===0;
        haut.onclick=function(){var t=ordre[i-1];ordre[i-1]=ordre[i];ordre[i]=t;dessiner();};
        var bas=creer('button','▼');bas.type='button';bas.disabled=i===ordre.length-1;
        bas.onclick=function(){var t=ordre[i+1];ordre[i+1]=ordre[i];ordre[i]=t;dessiner();};
        btns.appendChild(haut);btns.appendChild(bas);ligne.appendChild(btns);liste.appendChild(ligne);
      });
    }
    dessiner();zone.appendChild(liste);
    return function(){return {type:'T03',ordre:ordre.map(function(el){return el.id;})};};
  },
  T04:function(c,zone){
    zone.appendChild(creer('p',c.consigne));
    var selects={};
    c.gauche.forEach(function(g){
      var l=creer('label',g.texte+' : ');
      var sel=document.createElement('select');
      sel.appendChild(creer('option',''));
      c.droite.forEach(function(d){var o=creer('option',d.texte);o.value=d.id;sel.appendChild(o);});
      l.appendChild(sel);zone.appendChild(l);selects[g.id]=sel;
    });
    return function(){
      var paires=[];Object.keys(selects).forEach(function(gid){if(selects[gid].value)paires.push({gaucheId:gid,droiteId:selects[gid].value});});
      return {type:'T04',paires:paires};
    };
  },
  T05:function(c,zone){
    var segments=c.texte.split('[[trou]]');
    var conteneur=creer('div');conteneur.style.whiteSpace='pre-wrap';
    var champs=[];
    segments.forEach(function(seg,i){
      conteneur.appendChild(document.createTextNode(seg));
      if(i<c.trous.length){
        var trou=c.trous[i];
        if(trou.liste){
          var sel=document.createElement('select');sel.appendChild(creer('option',''));
          trou.choix.forEach(function(ch){var o=creer('option',ch);o.value=ch;sel.appendChild(o);});
          conteneur.appendChild(sel);champs.push(function(){return sel.value;});
        }else{
          var input=document.createElement('input');input.type='text';input.size=10;
          input.onfocus=function(){dernierChamp=input;};
          conteneur.appendChild(input);
          conteneur.appendChild(barreSymboles(input));
          champs.push(function(){return input.value;});
        }
      }
    });
    zone.appendChild(conteneur);
    return function(){return {type:'T05',trous:champs.map(function(f){return f();})};};
  },
  T09:function(c,zone){
    zone.appendChild(creer('p',c.question));
    var ch=champTexte(false);zone.appendChild(ch.wrap);
    if(c.unite)ch.wrap.appendChild(document.createTextNode(' '+c.unite));
    return function(){return {type:'T09',saisie:ch.input.value};};
  }
};

var lireSoumission = null;

async function charger(){
  var r=await fetch('/exercices/'+encodeURIComponent(id)+'/public');
  if(r.status!==200){document.getElementById('titre').textContent='Exercice introuvable.';return;}
  ex=await r.json();
  document.getElementById('titre').textContent=ex.titre;
  document.getElementById('enonce').textContent=ex.enonce;
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
