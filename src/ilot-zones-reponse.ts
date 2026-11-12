// Ilot partage du rendu des zones de reponse, selon le type d'exercice. Il sert a
// l'ecran de test du formateur (EM-CON-06) et a l'ecran d'exercice de l'apprenant
// (E-05). Il expose, dans le navigateur, la fabrique "rendus[type](contenu, zone)"
// qui dessine la zone et rend une fonction lisant la soumission. Le contenu arrive
// de la projection publique : il ne porte jamais la reponse attendue (EM-EXE-03).
export const ILOT_ZONES_REPONSE = `
var dernierChamp = null;
function creer(balise, texte){var e=document.createElement(balise);if(texte!==undefined)e.textContent=texte;return e;}

// Barre de symboles du pseudo-code (referentiel, point 3.4b).
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
  },
  T07:function(c,zone){
    zone.appendChild(creer('p','Corrigez l\\'erreur, puis validez.'));
    var ta=document.createElement('textarea');ta.className='code';ta.rows=6;ta.style.width='100%';
    ta.value=c.depart;ta.onfocus=function(){dernierChamp=ta;};
    zone.appendChild(ta);zone.appendChild(barreSymboles(ta));
    return function(){return {type:'T07',saisie:ta.value};};
  },
  T10:function(c,zone){
    zone.appendChild(creer('p',c.consigne));
    if(c.lienTP){var a=document.createElement('a');a.href=c.lienTP;a.target='_blank';a.rel='noopener';a.textContent='Ouvrir le TP';zone.appendChild(a);}
    zone.appendChild(creer('p','Code obtenu a la fin du TP :'));
    var ch=champTexte(false);zone.appendChild(ch.wrap);
    return function(){return {type:'T10',saisie:ch.input.value};};
  }
};
`;
