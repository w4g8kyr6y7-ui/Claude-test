const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, Bookmark, InternalHyperlink, ImageRun, PageBreak,
  LevelFormat, Footer, Header, PageNumber, TabStopType,
} = require('docx');

const OUT = process.argv[2];
const IMG = process.argv[3];

const RED = 'D0402B', BLUE = '2E5C9A', GREY = '7F7F7F', GREEN = '3A7D44';
const W = 9638; // largeur utile A4 avec marges de 2 cm

// ---------- Mise en forme inline ----------
// **gras**  //italique//  __souligné__  ==surligné==  [[définition]] (rouge, gras, souligné)
function runs(text, base = {}) {
  const re = /\*\*(.+?)\*\*|\/\/(.+?)\/\/|__(.+?)__|==(.+?)==|\[\[(.+?)\]\]/g;
  const out = []; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    if (m[1]) out.push(new TextRun({ text: m[1], ...base, bold: true }));
    else if (m[2]) out.push(new TextRun({ text: m[2], ...base, italics: true }));
    else if (m[3]) out.push(new TextRun({ text: m[3], ...base, underline: {} }));
    else if (m[4]) out.push(new TextRun({ text: m[4], ...base, highlight: 'yellow' }));
    else if (m[5]) out.push(new TextRun({ text: m[5], ...base, bold: true, underline: {}, color: RED }));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}
const P = (t, o = {}) => new Paragraph({ children: runs(t, o.run), spacing: { after: 120 }, ...o.para });
const B = (t, lvl = 0) => new Paragraph({ children: runs(t), numbering: { reference: 'puces', level: lvl }, spacing: { after: 60 } });
let numInst = 0;
const N = (items) => { numInst++; return items.map(t => new Paragraph({ children: runs(t), numbering: { reference: 'nums', level: 0, instance: numInst }, spacing: { after: 60 } })); };

// ---------- Titres avec signets (pour le sommaire cliquable) ----------
const toc = []; let bm = 0;
function H(level, text, inToc = true) {
  const id = 'sec' + (++bm);
  if (inToc) toc.push({ level, text, id });
  const heading = [null, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][level];
  return new Paragraph({ heading, children: [new Bookmark({ id, children: [new TextRun(text)] })] });
}

// ---------- Encadrés ----------
const BOX = {
  article: { fill: 'E8F0FB', border: BLUE, label: 'Article de loi' },
  remarque: { fill: 'F2F2F2', border: GREY, label: 'Remarque du professeur' },
  complement: { fill: 'F2F2F2', border: GREY, label: 'Complément (non présent dans les slides)' },
  exemple: { fill: 'EEF6EE', border: GREEN, label: 'Fil rouge : Lucas' },
  exercice: { fill: 'EEF6EE', border: GREEN, label: 'Exercice du cours' },
  retenir: { fill: 'FFF3DC', border: RED, label: 'Points à retenir' },
};
function box(kind, title, lines) {
  const k = BOX[kind];
  const b = { style: BorderStyle.SINGLE, size: 4, color: k.border };
  const children = [new Paragraph({ children: [new TextRun({ text: title || k.label, bold: true, color: k.border })], spacing: { after: 80 } })];
  for (const l of lines) children.push(l instanceof Paragraph ? l : P(l));
  return [new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: W, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: k.fill, color: 'auto' },
      margins: { top: 120, bottom: 80, left: 180, right: 180 },
      borders: { top: b, bottom: b, right: b, left: { style: BorderStyle.SINGLE, size: 24, color: k.border } },
      children,
    })] })],
  }), new Paragraph({ children: [], spacing: { after: 60 } })];
}
const art = (ref, text) => box('article', ref, [P(text, { run: { italics: true } })]);

// ---------- Tableaux ----------
function table(widths, header, rows) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (c, i, head) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, borders,
    shading: head ? { type: ShadingType.CLEAR, fill: '1F3864', color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: (Array.isArray(c) ? c : [c]).map(x => x instanceof Paragraph ? x :
      new Paragraph({ children: runs(x, head ? { bold: true, color: 'FFFFFF' } : {}), spacing: { after: 40 } })),
  });
  return [new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: header.map((c, i) => cell(c, i, true)) }),
      ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) }))],
  }), new Paragraph({ children: [], spacing: { after: 60 } })];
}
const link = (id, text) => new InternalHyperlink({ anchor: id, children: [new TextRun({ text, style: 'Hyperlink' })] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// =====================================================================
// CONTENU
// =====================================================================
const body = [];
const add = (...xs) => xs.forEach(x => Array.isArray(x) ? body.push(...x) : body.push(x));

// ---------------- Présentation du cours ----------------
add(H(1, 'Présentation du cours'));
add(P('Ce cours de **droit des affaires** (L2 S3, Mme Wolf) suit un **fil rouge** : l\'entreprise de **Lucas**, qui lance puis développe son activité. Chaque chapitre répond à une question que Lucas se pose.'));
add(table([2400, 3600, 3638], ['Partie', 'Question posée', 'Chapitres'], [
  ['**1. Comprendre**', 'Pourquoi l\'entreprise a-t-elle besoin du droit ?', 'Ch. 1 Découvrir le droit des affaires · Ch. 2 Qui peut exercer une activité commerciale ?'],
  ['**2. Faire vivre**', 'Comment une entreprise exerce-t-elle son activité ?', 'Ch. 3 Les éléments indispensables à l\'activité commerciale · Ch. 4 Contracter avec ses partenaires · Ch. 5 Se faire payer et financer son activité'],
  ['**3. Évoluer**', 'Comment développer son activité tout en respectant les règles du marché ?', 'Ch. 6 Vendre à des consommateurs · Ch. 7 Faire face à la concurrence · Ch. 8 Développer son activité dans un environnement numérique'],
  ['**4. Protéger**', 'Comment protéger ce qui fait la valeur de l\'entreprise ?', 'Ch. 9 Protéger les actifs immatériels · Ch. 10 Choisir une organisation juridique'],
  ['**5. Anticiper**', 'Que faire lorsque les choses ne se passent plus comme prévu ?', 'Ch. 11 Prévenir et traiter les difficultés · Ch. 12 Cas transversal : le diagnostic juridique de l\'entreprise de Lucas'],
]));
add(P('**Évaluation : uniquement des QCM.**'));
add(B('==QCM intermédiaire== (fin octobre) : 30 questions.'));
add(B('==QCM final== (décembre) : 60 questions.'));
add(B('Les questions portent sur les **connaissances** du cours, la **compréhension** des notions juridiques et la **capacité à mobiliser les règles** dans des situations concrètes.'));
add(P('Ressources Moodle pour chaque chapitre : support étudiant (plan, notions, articles de loi, schémas), support d\'exercices, QCM d\'entraînement et PowerPoint du CM. Les corrigés sont publiés deux semaines après le cours (au plus tard fin novembre).'));
add(pageBreak());

// =====================================================================
// CHAPITRE 1
// =====================================================================
add(H(1, 'Chapitre 1 – Découvrir le droit des affaires'));
add(P('CM 03/09', { run: { color: GREY } }));
add(box('exemple', 'Fil rouge : faites connaissance avec Lucas', [
  'Lucas a 20 ans. Il souhaite lancer une activité de **vente de produits personnalisés**. Il envisage de vendre sur Internet puis, si son activité fonctionne, d\'ouvrir une boutique. Il devra acheter du matériel, trouver des fournisseurs et vendre ses produits à des particuliers.',
  '**Question :** quelles questions juridiques son projet peut-il soulever ?',
]));

// ----- 1 -----
add(H(2, '1. Le droit des affaires et l\'activité économique'));
add(H(3, 'A. Un droit centré sur l\'activité économique'));
add(P('Le [[droit des affaires]] est un droit plus large que le droit commercial. C\'est ==l\'ensemble des règles juridiques qui encadrent les activités économiques et leurs acteurs==.'));
add(P('Le [[droit commercial]], lui, est historiquement centré sur deux notions seulement : **les commerçants** et **les actes de commerce**. Cette approche est devenue **trop étroite**, d\'où l\'émergence du droit des affaires.'));
add(box('remarque', null, ['Dans vos notes, la définition « ensemble des règles juridiques qui encadrent les activités économiques et leurs acteurs » était attribuée au droit commercial. D\'après la slide, c\'est la définition du **droit des affaires**. Le droit commercial n\'en est qu\'une partie.']));
add(P('[[L\'activité économique]], c\'est dès qu\'il y a une transaction. Elle recouvre cinq grandes actions :'));
add(B('**Contracter** : conclure des contrats avec des partenaires (fournisseurs, clients…).'));
add(B('**Financer** : obtenir des financements, gérer les paiements.'));
add(B('**Vendre** : vendre des biens ou des services à des clients.'));
add(B('**Se développer** : développer son activité, utiliser le numérique, se positionner.'));
add(B('**Protéger** : protéger ses actifs, ses créations, ses données…'));
add(P('**Objectif du droit des affaires :** accompagner l\'entreprise à chaque étape de son activité économique. Pour Lucas, le droit sera présent à toutes les étapes de son projet.'));
add(P('Le droit des affaires fait partie du **droit privé**, puisqu\'il régit les relations entre personnes privées (particuliers et entreprises).'));

add(H(3, 'B. Un droit pragmatique et évolutif'));
add(...N([
  'S\'adapter aux ==besoins== : **rapidité**, **souplesse**, **sécurité**.',
  'S\'adapter aux ==évolutions== : **commerce en ligne**, **données**, **intelligence artificielle**.',
  '==Trouver l\'équilibre== entre la **liberté économique** et la **protection des acteurs**.',
]));

add(H(3, 'C. Un droit au croisement de plusieurs branches'));
add(P('Le droit des affaires est un ==droit carrefour== : on peut le représenter comme un arbre avec plusieurs branches.'));
if (IMG && fs.existsSync(IMG)) {
  add(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'jpg', data: fs.readFileSync(IMG), transformation: { width: 520, height: 293 } })] }));
}
add(table([3000, 6638], ['Branche', 'Ce qu\'elle couvre'], [
  ['**Droit civil**', 'Contrats, responsabilité, obligations'],
  ['**Droit commercial**', 'Commerçants, actes de commerce, fonds de commerce'],
  ['**Droit des sociétés**', 'Création, organisation, fonctionnement'],
  ['**Droit de la consommation**', 'Information, contrats, protection du consommateur'],
  ['**Droit de la concurrence**', 'Liberté du commerce et de l\'industrie, pratiques déloyales, marché'],
  ['**Propriété intellectuelle**', 'Marques, brevets, dessins et modèles, droits d\'auteur, savoir-faire'],
  ['**Droit du numérique**', 'Commerce en ligne, données personnelles, protection des données, IA'],
]));
add(P('La slide de synthèse mentionne aussi le **droit pénal des affaires**.'));

// ----- 2 -----
add(H(2, '2. Le rôle du droit dans la vie de l\'entreprise'));
add(P('Le droit joue trois rôles successifs : ==Sécuriser → Faciliter → Créer la confiance==.'));
add(H(3, 'A. Sécuriser les relations économiques'));
add(P('Exemple : Lucas conclut un accord avec son fournisseur. Le droit intervient à trois moments :'));
add(table([2200, 4238, 3200], ['Moment', 'Questions / situations', 'Rôle du droit'], [
  ['**1. Avant** : prévoir', 'Qui doit faire quoi ? Dans quel délai ? À quel prix ?', 'Définir les **droits et obligations**'],
  ['**2. Pendant** : sécuriser', 'Des règles connues, des engagements précis', '**Réduire l\'incertitude**'],
  ['**3. En cas de problème** : réagir', 'Inexécution, retard, impayé', 'Obtenir **l\'exécution ou la réparation**'],
]));
add(P('Avant même de créer une entreprise, on a donc besoin du droit pour **prévoir**. Pendant la relation, il **sécurise** en réduisant l\'incertitude. En cas de problème, on l\'utilise pour **réagir** et obtenir l\'exécution ou la réparation.'));

add(H(3, 'B. Favoriser l\'efficacité des échanges'));
add(P('Le droit fournit une **boîte à outils** pour organiser l\'échange entre Lucas et son fournisseur :'));
add(B('**Contrat** : organiser la relation.'));
add(B('**Paiement** : sécuriser les règlements.'));
add(B('**Garanties** : prévoir des protections.'));
add(B('**Délais** : fixer des échéances.'));
add(P('Ces outils produisent trois effets :'));
add(...N([
  '**Un cadre commun** : des règles connues par tous (contrats, paiement, responsabilité).',
  '**De la souplesse** : des règles adaptées à la vie des affaires (rapidité, ==liberté de la preuve==, liberté contractuelle).',
  '**Des échanges facilités** : les entreprises peuvent organiser leurs relations, contracter plus efficacement et se développer plus sereinement.',
]));
add(H(4, 'Zoom : la preuve (vu à l\'oral en cours)'));
add(P('Il existe des **preuves parfaites** (l\'écrit, qui s\'impose au juge) et des **preuves imparfaites** (témoignages, caméras, empreintes, photos…), que le juge apprécie librement.'));
add(P('Ce qu\'il faut prouver n\'est pas le même selon qu\'il s\'agit d\'un acte ou d\'un fait :'));
add(B('[[Acte juridique]] (ex. : un contrat) : en principe, **preuve par écrit**. Exceptions : acte d\'un montant **inférieur ou égal à 1 500 €** (preuve par tout moyen), ou **impossibilité morale ou matérielle** de se procurer un écrit.'));
add(B('[[Fait juridique]] (ex. : un accident) : **preuve par tout moyen**.'));
add(P('[[La charge de la preuve]] : qui doit apporter la preuve ? Celui qui réclame l\'exécution d\'une obligation, c\'est-à-dire **le plus souvent le demandeur**.'));
add(box('complement', null, [
  'Les règles que vous avez notées viennent du **Code civil** : art. 1353 (charge de la preuve), art. 1358 (preuve par tout moyen), art. 1359 (écrit obligatoire au-delà de 1 500 €) et art. 1360 (impossibilité morale ou matérielle). Ils sont dans le glossaire.',
  'Retenez dès maintenant qu\'**entre commerçants**, la preuve des actes de commerce est **libre** (art. L.110-3 du Code de commerce, vu au chapitre 2).',
]));

add(H(3, 'C. Instaurer la confiance entre les acteurs'));
add(P('Lucas est en relation avec un **fournisseur** (qui lui livre les produits), des **clients** (qui achètent ses produits), une **banque** (qui peut financer son activité) et des **concurrents** (qui se développent sur le même marché). Il n\'a pas toujours de lien personnel avec chacun d\'eux. ==Grâce au droit, il peut échanger en toute confiance.=='));
add(P('Comment savoir si un acteur est fiable ?'));
add(...N([
  '**Transparence** (savoir avec qui on échange) : identification des entreprises, informations accessibles (immatriculation, publicité légale…).',
  '**Règles du jeu** (des comportements encadrés) : engagements à respecter (contrats), information obligatoire, loyauté et concurrence saine, protection des données et des consommateurs.',
  '**Protection** (des comportements sanctionnés) : tromperie, fraude, non-respect des engagements, concurrence déloyale. Sanctions **civiles, administratives ou pénales**.',
]));
add(P('**Résultat : la confiance.** Des échanges deviennent possibles entre des acteurs qui ne se connaissent pas.'));
add(P('À connaître (dit en cours) : les tribunaux de l\'ordre **civil** et de l\'ordre **pénal**.'));
add(box('complement', null, [
  'Les juridictions **civiles** et **pénales** forment ensemble l\'**ordre judiciaire**. Juridictions civiles de premier degré : tribunal judiciaire, tribunal de commerce, conseil de prud\'hommes. Juridictions pénales : tribunal de police (contraventions), tribunal correctionnel (délits), cour d\'assises (crimes). L\'**ordre administratif** (tribunal administratif, Conseil d\'État) juge les litiges avec l\'Administration.',
]));

// ----- 3 -----
add(H(2, '3. Les sources du droit des affaires'));
add(H(3, 'A. Les sources nationales'));
add(P('Les sources nationales sont hiérarchisées selon la ==pyramide de Kelsen== (hiérarchie des normes) : chaque norme doit respecter celles qui lui sont supérieures.'));
add(table([2400, 7238], ['Niveau', 'Contenu'], [
  ['**1. Constitution**', 'Les principes fondamentaux. //Exemple : la liberté d\'entreprendre.//'],
  ['**2. Loi**', ['Les règles essentielles de la vie des affaires, rassemblées dans des codes :',
    B('**Code civil** : contrats, responsabilité.'),
    B('**Code de commerce** : commerçant, fonds de commerce, sociétés, difficultés des entreprises.'),
    B('**Code de la consommation** : relations professionnel / consommateur.'),
    B('**Code de la propriété intellectuelle** : marques, brevets, créations.')]],
  ['**3. Règlements**', 'Les modalités et règles techniques : **décrets** et **arrêtés**.'],
]));
add(box('complement', null, ['Dans la pyramide complète, les **traités internationaux et le droit de l\'Union européenne** se placent **entre la Constitution et la loi** (art. 55 de la Constitution) : ils ont une autorité supérieure aux lois.']));

add(H(3, 'B. Les sources européennes et internationales'));
add(P('**L\'Union européenne exerce une influence majeure** sur le droit des affaires dans quatre domaines : la **consommation** (protection des consommateurs), la **concurrence** (marché concurrentiel et loyal), les **données personnelles** (protection de la vie privée, RGPD) et le **numérique & l\'IA** (régulation des services numériques).'));
add(P('Le [[droit primaire]] fonde l\'UE : ce sont les **traités**. Le droit dérivé, adopté par les institutions européennes, prend deux formes principales :'));
add(table([2400, 7238], ['Acte européen', 'Effet'], [
  ['[[Règlement]]', '==Directement applicable== dans tous les États membres. //Exemple : le RGPD s\'applique directement à toutes les entreprises.//'],
  ['[[Directive]]', 'Fixe ==un objectif à atteindre== : elle doit être **transposée** dans le droit national.'],
]));
add(P('**Au niveau international**, le droit encadre les échanges internationaux :'));
add(B('**Traités et conventions internationales** : accords entre États ou organisations internationales.'));
add(B('**Relations avec des partenaires étrangers** : contrats internationaux, conditions générales de vente, lois applicables…'));
add(B('**Échanges internationaux** : commerce international, transport, règles douanières, investissements…'));
add(P('==Le droit européen et le droit international peuvent s\'appliquer même si l\'activité de l\'entreprise est réalisée en France.== L\'entreprise de Lucas est française, mais elle évolue dans un environnement ouvert sur le monde.'));

add(H(3, 'C. La jurisprudence et les autres sources du droit des affaires'));
add(H(4, '1) La jurisprudence'));
add(P('La [[jurisprudence]] est l\'ensemble des décisions rendues par les tribunaux. Le juge **interprète, précise et fait évoluer** la règle :'));
add(B('**Interpréter** : donner un sens aux textes.'));
add(B('**Préciser** : compléter les textes dans les zones d\'ombre.'));
add(B('**Faire évoluer** : adapter la règle aux nouveaux cas.'));
add(P('//Exemples : concurrence déloyale, responsabilité du dirigeant, rupture brutale des relations commerciales.//'));
add(P('**Le parcours d\'une affaire (vos notes) :**'));
add(...N([
  '**Premier degré** : le juge rend un **jugement**.',
  '**Appel** (si une partie interjette appel) : la cour d\'appel rend un **arrêt confirmatif** (même solution qu\'en premier degré) ou **infirmatif** (solution différente).',
  '**Cour de cassation** (pourvoi) : elle ne rejuge pas les faits, elle **vérifie que la loi a été bien appliquée**. Elle rend un **arrêt de rejet** (la décision d\'appel est maintenue) ou un **arrêt de cassation** (la décision d\'appel est annulée et l\'affaire est en principe renvoyée devant une autre cour d\'appel).',
]));
add(H(4, '2) Les usages professionnels'));
add(P('Les [[usages professionnels]] sont des **pratiques répétées et reconnues comme obligatoires**. Ce sont des **sources non écrites** :'));
add(B('pratiques constantes dans un secteur ou une profession ;'));
add(B('acceptées et respectées par les professionnels concernés ;'));
add(B('elles ont un sens juridique : elles **s\'imposent aux membres du groupe concerné**.'));
add(P('//Exemples : délais de paiement habituels, usages bancaires, pratiques d\'un secteur.//'));
add(H(4, '3) Le droit souple'));
add(P('Le [[droit souple]] cherche à **orienter et influencer les comportements**. Ce sont des **sources non contraignantes juridiquement** :'));
add(B('recommandations d\'autorités publiques (AMF, CNIL, DGCCRF…) ;'));
add(B('lignes directrices, guides pratiques ;'));
add(B('codes de conduite, chartes, labels, bonnes pratiques.'));
add(P('//Exemples : recommandations de l\'AMF, charte du numérique responsable.//'));
add(P('==Ces sources complètent et enrichissent les règles écrites.=='));

// ----- 4 -----
add(H(2, '4. L\'articulation entre droit civil et droit commercial'));
add(H(3, 'A. Le Code civil : le droit commun des relations privées'));
add(P('Le [[droit civil]] est ==le droit commun== : il s\'applique à toutes les relations privées, sauf règle spéciale. Il couvre :'));
add(B('**Contrats** : former et exécuter les contrats.'));
add(B('**Obligations** : organiser les rapports entre créancier et débiteur.'));
add(B('**Responsabilité** : réparer les dommages causés à autrui.'));
add(H(3, 'B. Le Code de commerce : les règles propres à la vie des affaires'));
add(P('Le [[droit commercial]] contient ==des règles spéciales adaptées à la vie des affaires==, guidées par trois objectifs :'));
add(B('**Rapidité** : faciliter les échanges avec des règles adaptées au rythme des affaires.'));
add(B('**Souplesse** : adapter les règles aux professionnels, en tenant compte de leurs habitudes et pratiques.'));
add(B('**Sécurité** : sécuriser les transactions et favoriser la confiance entre partenaires.'));
add(P('Concrètement, cela donne trois séries de règles :'));
add(...N([
  '**Preuve** : ==liberté de la preuve entre commerçants==. Les actes de commerce peuvent, en principe, se prouver par tous moyens.',
  '**Paiement** : règles propres aux relations commerciales (délais de paiement, intérêts moratoires, indemnité forfaitaire de recouvrement…).',
  '**Activité commerciale** : règles spécifiques sur le commerçant, le fonds de commerce et les actes de commerce.',
]));
add(H(3, 'C. L\'articulation et le rapprochement des deux logiques'));
add(P('Pour savoir quelle règle appliquer, on se pose **trois questions dans l\'ordre** :'));
add(table([2200, 3700, 3738], ['Question', 'Ce qu\'on cherche', 'Réponses possibles'], [
  ['**1. Qui ?**', 'Quels sont les acteurs ?', 'Particulier, commerçant, professionnel, consommateur'],
  ['**2. Quoi ?**', 'Quelle est l\'opération ?', 'Acte civil, acte de commerce, relation professionnelle, relation avec un consommateur'],
  ['**3. Quelles règles ?**', 'Existe-t-il une règle spéciale ?', ['**Non** → le **droit civil** (droit commun) s\'applique.', '**Oui** → la **règle spéciale** complète ou écarte le droit commun.']],
]));
add(P('C\'est l\'application de l\'adage ==« le spécial déroge au général »==.'));
add(P('**Méthode de raisonnement juridique :** ==Identifier== (les acteurs et l\'opération) → ==Qualifier== (la situation juridique) → ==Appliquer== (la règle adaptée) → ==Décider== (et conseiller en sécurité).'));
add(box('exemple', 'Transition vers le chapitre 2', ['Lucas vend régulièrement des produits… Mais avant d\'appliquer les règles commerciales, une question essentielle se pose : **Lucas est-il commerçant ?**']));

// ----- Points à retenir ch1 -----
add(H(2, 'Points à retenir – Chapitre 1'));
add(box('retenir', 'Points à retenir – Chapitre 1', [
  B('Le **droit des affaires** est l\'ensemble des règles juridiques qui encadrent les activités économiques et leurs acteurs. C\'est un **droit carrefour**, plus large que le droit commercial (qui se limite aux commerçants et aux actes de commerce).'),
  B('Il est **pragmatique et évolutif** : il s\'adapte aux besoins (rapidité, souplesse, sécurité) et aux évolutions (commerce en ligne, données, IA), et cherche l\'équilibre entre liberté économique et protection des acteurs.'),
  B('Il a **trois rôles** : **sécuriser** (avant / pendant / en cas de problème), **faciliter** les échanges et **créer la confiance** (transparence, règles du jeu, protection).'),
  B('**Preuve** : acte juridique → écrit au-delà de 1 500 € ; fait juridique → tout moyen ; la charge de la preuve pèse en général sur le demandeur ; **entre commerçants, la preuve est libre**.'),
  B('**Sources** : nationales (Constitution > loi > règlements), européennes (**règlement** = directement applicable ; **directive** = à transposer), internationales, **jurisprudence**, **usages professionnels**, **droit souple**.'),
  B('**Jurisprudence** : jugement (1er degré) → arrêt confirmatif / infirmatif (appel) → arrêt de rejet / de cassation (Cour de cassation, qui juge le droit et non les faits).'),
  B('**Droit civil = droit commun** ; **droit commercial = règles spéciales** qui complètent ou écartent le droit commun. Méthode : **Qui ? → Quoi ? → Quelles règles ?**'),
]));
add(pageBreak());

// =====================================================================
// CHAPITRE 2
// =====================================================================
add(H(1, 'Chapitre 2 – Qui peut exercer une activité commerciale ?'));
add(box('exemple', 'Fil rouge : Lucas se lance !', [
  'Lucas, 20 ans, **achète des produits**, **les revend sur son site internet**, et **réalise ces opérations régulièrement**.',
  '**Question : Lucas est-il devenu commerçant ?**',
]));
add(P('Point de départ essentiel : ==Acte de commerce ≠ qualité de commerçant==. Accomplir un acte de commerce **ne suffit pas** à devenir commerçant.'));
add(P('Pour répondre à la question, on suit **trois étapes** :'));
add(table([3212, 3213, 3213], ['1. Que fait Lucas ?', '2. Qui est Lucas ?', '3. Que doit-il faire ?'], [
  ['Qualifier son activité', 'Déterminer son statut', 'Identifier ses obligations'],
  ['→ **les actes de commerce**', '→ **la qualité de commerçant**', '→ **immatriculation, comptabilité, publicité**'],
]));

// ----- 1 -----
add(H(2, '1. Les actes de commerce'));
add(P('Trois situations pour commencer : Lucas (1) **achète 100 sweats pour les revendre**, (2) **achète un ordinateur pour gérer sa boutique**, (3) **achète un ordinateur pour son usage personnel**. Ces trois achats n\'ont pas la même nature juridique : la suite du cours explique pourquoi.'));
add(H(3, 'A. La notion d\'acte de commerce'));
add(P('La notion d\'acte de commerce **n\'est pas réellement définie** dans le Code de commerce.'));
add(P('[[Acte de commerce]] : une opération à laquelle le droit reconnaît un **caractère commercial**. ==La qualification dépend de l\'opération réalisée.=='));
add(art('Article L.110-1 du Code de commerce', 'Le Code de commerce énumère différentes opérations auxquelles il reconnaît un caractère commercial. Exemples : achat pour revendre, certaines opérations d\'intermédiaire, entreprise de manufacture, transport, banque… La liste de l\'article L.110-1 n\'est pas limitative.'));
add(P('La commercialité d\'un acte peut reposer sur ==trois fondements différents : la nature, la forme, l\'accessoire==.'));

add(H(3, 'B. Les principales catégories d\'actes de commerce'));
add(H(4, '1) L\'acte de commerce par nature'));
add(P('[[Par nature]] : c\'est **l\'objet de l\'opération** qui la rend commerciale. //Exemples : achat pour revendre, transport, banque, certaines activités de production.//'));
add(P('L\'**achat pour revendre** (art. L.110-1, 1° du Code de commerce) suppose **trois éléments** :'));
add(...N([
  '**Un achat** : le bien doit avoir été acquis.',
  '**Une intention de revendre** : elle doit exister ==dès l\'achat==.',
  '**Une intention spéculative** : rechercher un bénéfice.',
]));
add(box('remarque', 'À ne pas confondre', ['==Intention spéculative ≠ bénéfice effectivement réalisé.== Une opération peut rester commerciale **même si la revente entraîne finalement une perte**. Ce qui compte, c\'est la recherche d\'un bénéfice au moment de l\'achat.']));
add(box('exemple', null, ['Lucas achète **100 sweats à 20 €** l\'unité avec l\'intention de les revendre **35 €**. Achat ✓, intention de revendre dès l\'achat ✓, intention spéculative ✓ → **acte de commerce par nature**.']));

add(H(4, '2) L\'acte de commerce par la forme'));
add(P('[[Par la forme]] : c\'est **sa forme juridique** qui rend l\'acte commercial. Une forme juridique déterminée entraîne la ==commercialité, indépendamment de l\'activité de son auteur==.'));
add(P('**Exemple emblématique : la lettre de change**, acte de commerce par la forme (art. L.110-1, 10° du Code de commerce), quelle que soit la personne qui la signe.'));
add(box('remarque', 'À distinguer', [
  '**Acte** commercial par la forme (ex. : lettre de change) **≠ société** commerciale par la forme (ex. : SARL, SAS, SA, SNC).',
  '==Une société n\'est pas un acte de commerce.==',
]));
add(P('**Nature ou forme ?** Pour l\'acte par nature, on regarde **l\'objet** de l\'opération. Pour l\'acte par la forme, **la forme juridique suffit** à déterminer la commercialité.'));

add(H(4, '3) L\'acte de commerce par accessoire'));
add(P('[[Par accessoire]] : un acte **normalement civil** devient commercial lorsqu\'il est accompli **par un commerçant pour les besoins de son activité commerciale**. ==« L\'accessoire suit le principal. »=='));
add(P('**Deux conditions cumulatives :**'));
add(...N(['Être accompli **par un commerçant** ;', '**Pour les besoins de son activité commerciale**.']));
add(table([4819, 4819], ['Dans l\'activité professionnelle', 'Dans la vie personnelle'], [
  ['Lucas, commerçant, achète un ordinateur **pour gérer sa boutique**', 'Lucas achète un ordinateur **pour son usage personnel**'],
  ['→ **Acte de commerce par accessoire**', '→ **Acte civil**'],
]));
add(P('==Les actes de la vie personnelle du commerçant restent civils.=='));

add(H(4, '4) L\'acte mixte'));
add(P('Un même contrat peut-il être à la fois commercial et civil ? Oui : c\'est l\'[[acte mixte]], un acte ==commercial pour l\'une des parties et civil pour l\'autre== (typiquement une relation **B2C**).'));
add(box('exemple', null, ['Lucas (**commerçant**) vend un sweat à Emma (**particulière**) : un seul contrat de vente. Pour Lucas, la vente est réalisée dans le cadre de son activité commerciale → **acte commercial**. Pour Emma, qui l\'achète pour son usage personnel → **acte civil**.']));
add(P('**Pourquoi est-ce important ?**'));
add(B('**Preuve** : les règles peuvent différer selon la personne **contre laquelle** la preuve doit être apportée.'));
add(B('**Juridiction** : les règles de compétence peuvent varier selon **celui qui engage l\'action**.'));
add(box('complement', null, [
  '**Preuve** : contre le commerçant, la preuve est libre ; contre le particulier, il faut respecter les règles du Code civil (écrit au-delà de 1 500 €).',
  '**Juridiction** : si le particulier est attaqué, il doit l\'être devant le tribunal judiciaire ; s\'il attaque le commerçant, il peut en principe choisir entre le tribunal judiciaire et le tribunal de commerce.',
]));

add(H(3, 'C. Distinguer les activités commerciales, artisanales et libérales'));
add(P('Il faut identifier le type d\'activité économique exercée : commerciale, artisanale, libérale (mais aussi agricole ou industrielle).'));
add(table([2000, 2700, 4938], ['Activité', 'Logique dominante', 'Caractéristiques'], [
  ['**Commerciale** //(Lucas)//', 'Acheter → revendre', 'Opérations juridiquement commerciales'],
  ['**Artisanale** //(Léa)//', 'Travail personnel + savoir-faire', 'Production, transformation, réparation, services'],
  ['**Libérale** //(Hugo)//', 'Prestation intellectuelle ou technique', 'Activité exercée de manière indépendante'],
]));
add(box('remarque', 'Les frontières peuvent être plus complexes', ['Une même personne peut exercer plusieurs types d\'activités. Ex. : un artisan peut aussi acheter et revendre certains produits. Il faut alors regarder **la place respective de chaque activité**.']));
add(box('exemple', 'Bilan d\'étape', [
  'Nous avons qualifié **ce que Lucas fait** : achat pour revendre → acte de commerce **par nature** ; ordinateur pour la boutique → acte de commerce **par accessoire** ; vente à un particulier → **acte mixte**.',
  'Nous allons maintenant déterminer **qui il est juridiquement** : est-il commerçant ? Rappel : accomplir un acte de commerce ne suffit pas nécessairement à avoir la qualité de commerçant.',
]));

// ----- 2 -----
add(H(2, '2. Le commerçant'));
add(H(3, 'A. Les conditions de la qualité de commerçant'));
add(art('Article L.121-1 du Code de commerce', '« Sont commerçants ceux qui exercent des actes de commerce et en font leur profession habituelle. »'));
add(P('Être [[commerçant]], c\'est réunir ==trois conditions cumulatives== :'));
add(table([3000, 3300, 3338], ['Condition', 'Signification', 'Exemples / indices'], [
  ['**1. Accomplir des actes de commerce**', 'Exercer effectivement une activité commerciale', 'Achat pour revendre, vente de marchandises, prestations commerciales…'],
  ['**2. En faire sa profession habituelle**', 'Répétition des actes et exercice à titre professionnel', 'Activité exercée régulièrement ; organisation stable (clientèle, matériel, locaux…) ; recherche d\'un bénéfice'],
  ['**3. Agir de manière indépendante**', 'En son nom et pour son propre compte', 'Absence de lien de subordination ; supporte les risques et en retire les bénéfices'],
]));
add(box('exemple', 'Et Lucas ?', [
  '**1. Actes de commerce** : il achète des produits pour les revendre → oui. **2. Profession habituelle** : il le fait régulièrement, à titre professionnel, pour générer un revenu → oui. **3. Indépendance** : il agit en son nom, pour son propre compte, supporte les risques et en retire les bénéfices → oui.',
  '→ ==Lucas a la qualité de commerçant.==',
]));
add(box('exercice', 'Exercice du cours : Lina', [
  'Lina, 21 ans, achète régulièrement des bijoux auprès de grossistes et les revend sur une plateforme en ligne. Elle choisit elle-même ses fournisseurs, fixe ses prix et organise librement son activité. **Lina a-t-elle la qualité de commerçante ?** Justifiez avec les 3 critères.',
  '**Correction :**',
  B('**Actes de commerce** ✓ : elle achète des bijoux pour les revendre avec l\'intention d\'en tirer un bénéfice → achat pour revendre = acte de commerce par nature (art. L.110-1, 1°).'),
  B('**Profession habituelle** ✓ : elle le fait **régulièrement**, avec une organisation (grossistes, plateforme en ligne).'),
  B('**Indépendance** ✓ : elle choisit ses fournisseurs, fixe ses prix et organise librement son activité → elle agit en son nom et pour son propre compte, sans lien de subordination.'),
  'Les trois conditions de l\'art. L.121-1 sont réunies et Lina est majeure → **Lina a la qualité de commerçante.**',
]));

add(H(3, 'B. Les conditions tenant à la personne'));
add(H(4, 'Et si Lucas avait 17 ans ? La capacité du mineur'));
add(P('À 20 ans, Lucas n\'a **aucun problème de capacité** lié à son âge. Mais s\'il avait 17 ans :'));
add(table([2400, 7238], ['Situation', 'Peut-il être commerçant ?'], [
  ['**Mineur non émancipé**', '**Non.** Même s\'il accomplit des actes de commerce et les exerce habituellement, il n\'a pas la **capacité** d\'exercer le commerce.'],
  ['**Mineur émancipé**', '**Oui, sous condition d\'autorisation** : il doit obtenir une autorisation spécifique **du juge** (au moment de l\'émancipation) **ou du président du tribunal judiciaire** (si la demande est faite après l\'émancipation). L\'émancipation est possible à partir de 16 ans.'],
]));
add(art('Article L.121-2 du Code de commerce', 'Le mineur émancipé peut être commerçant sur autorisation du juge au moment de son émancipation ou du président du tribunal judiciaire s\'il formule cette demande après avoir été émancipé.'));
add(box('remarque', null, [
  'Dans vos notes, vous aviez écrit « autorisation de ses responsables légaux ». Attention : d\'après l\'article L.121-2, l\'autorisation vient **d\'un juge** (le juge des tutelles au moment de l\'émancipation, ou le président du tribunal judiciaire ensuite), **pas des parents**.',
  'La slide de synthèse finale parle d\'« autorisation de son représentant légal ou du juge des tutelles ». Fiez-vous au texte de l\'article ci-dessus et demandez confirmation à Mme Wolf si besoin.',
]));
add(H(4, 'Être majeur et capable suffit-il toujours ?'));
add(P('**Non.** Trois types d\'obstacles peuvent empêcher une personne d\'exercer le commerce :'));
add(table([2600, 3600, 3438], ['Obstacle', 'Contenu', 'Idée clé'], [
  ['**1. Incapacité / protection** //(protéger la personne)//', 'Majeur faisant l\'objet d\'une mesure de protection : capacité d\'exercice limitée selon la mesure (**sauvegarde de justice, curatelle, tutelle**…).', 'Le droit **protège la personne** et ses intérêts.'],
  ['**2. Interdiction / déchéance** //(écarter certaines personnes du commerce)//', 'Certaines condamnations ou décisions (ex. : **faillite personnelle**) peuvent entraîner une interdiction d\'exercer une activité commerciale ou de diriger une entreprise. Logique de **sanction** et de **protection de la vie des affaires**.', 'Le droit **sanctionne ou écarte** certaines personnes du commerce.'],
  ['**3. Incompatibilité** //(préserver l\'indépendance de certaines fonctions)//', 'Certaines professions ou fonctions ne peuvent pas être cumulées avec une activité commerciale. Ex. : **fonctionnaires**, certaines professions juridiques ou judiciaires (**avocat, magistrat**…).', 'Le droit évite les **conflits d\'intérêts** et protège l\'**impartialité**.'],
]));

add(H(3, 'C. Les conséquences de la qualité de commerçant'));
add(P('Le droit commercial applique-t-il toujours les mêmes règles que le droit civil ? **Non.** Être commerçant entraîne plusieurs conséquences :'));
add(H(4, '1) Prouver plus librement'));
add(art('Article L.110-3 du Code de commerce', '« À l\'égard des commerçants, les actes de commerce peuvent se prouver par tous moyens […] »'));
add(P('**Principe :** ==liberté de la preuve== : écrit, courriel, facture, témoignage… Cette règle est adaptée à la **rapidité** et à l\'**efficacité** des échanges commerciaux.'));
add(H(4, '2) Une juridiction spécialisée : le tribunal de commerce'));
add(P('Le [[tribunal de commerce]] connaît notamment des litiges relatifs **aux engagements entre commerçants**, **aux sociétés commerciales** et **aux actes de commerce**.'));
add(art('Article L.721-3 du Code de commerce', '« Le tribunal de commerce connaît des litiges relatifs aux obligations nées à l\'occasion d\'actes de commerce entre commerçants… »'));
add(P('C\'est ==une compétence spécifique pour des litiges liés à la vie des affaires==.'));
add(H(4, '3) Des obligations professionnelles'));
add(B('**Immatriculation** : au RCS, pour être reconnu et exercer légalement.'));
add(B('**Comptabilité** : tenue d\'une comptabilité régulière, sincère et fidèle.'));
add(B('**Publicité / information** : informer les tiers sur son activité et sa situation.'));
add(P('//Ces obligations sont détaillées dans la partie 3.//'));
add(H(4, '4) Le patrimoine de l\'entrepreneur individuel (EI)'));
add(table([4819, 4819], ['Patrimoine professionnel', 'Patrimoine personnel'], [
  ['Biens, droits, obligations et sûretés **utiles à l\'activité professionnelle**', 'Les autres éléments du patrimoine (biens personnels, épargne, **résidence principale**…)'],
]));
add(P('**Séparation de principe** entre les deux. ==Principe : les créanciers professionnels ont pour gage le patrimoine professionnel==, sous réserve des exceptions prévues par la loi.'));
add(P('Auparavant, la **confusion** entre patrimoine professionnel et personnel pouvait conduire à endetter le patrimoine personnel de l\'entrepreneur, ce qui freinait l\'incitation à entreprendre. Des mesures ont été prises, par exemple pour **sécuriser la résidence principale**.'));
add(box('complement', null, ['Depuis la loi du 14 février 2022 (en vigueur le 15 mai 2022), cette séparation des patrimoines de l\'EI est **automatique** (art. L.526-22 du Code de commerce). La résidence principale de l\'entrepreneur était déjà insaisissable de plein droit par ses créanciers professionnels depuis 2015.']));

// ----- 3 -----
add(H(2, '3. Les obligations du commerçant'));
add(P('Nous savons **ce que fait Lucas** (il accomplit des actes de commerce) et **qui il est** (il a la qualité de commerçant). Que doit-il faire ? **S\'immatriculer, tenir une comptabilité, être identifiable par les tiers.**'));
add(H(3, 'A. L\'immatriculation de l\'entreprise'));
add(P('**Le parcours d\'immatriculation :**'));
add(...N([
  '**Déclarer** : Lucas dépose son dossier en ligne sur le ==guichet unique== (formalites.entreprises.gouv.fr).',
  '**Transmission** : le guichet unique transmet les informations aux organismes compétents selon l\'activité de l\'entreprise.',
  '**Immatriculation** : inscription au **RNE** et, selon les cas, au **RCS**. L\'entreprise reçoit son numéro d\'immatriculation.',
]));
add(art('Article R.123-220 du Code de commerce', '« Les déclarations relatives aux entreprises sont accomplies, sauf dispositions contraires, au moyen d\'un formulaire dématérialisé unique, sur le guichet unique. »'));
add(table([2400, 7238], ['Registre', 'Rôle'], [
  ['[[RNE]] (Répertoire national des entreprises)', 'Base de données nationale qui identifie **toutes les entreprises**, quels que soient leur statut ou leur activité.'],
  ['[[RCS]] (Registre du commerce et des sociétés)', 'Registre tenu par les **greffes des tribunaux de commerce**. Il concerne **les commerçants et les sociétés commerciales**.'],
]));
add(P('**À retenir :** ==toutes les entreprises sont au RNE ; seules les entreprises commerciales sont au RCS.=='));

add(H(3, 'B. Les principales obligations comptables et professionnelles'));
add(H(4, '1) Tenir une comptabilité : enregistrer les opérations de l\'entreprise'));
add(B('Comptabilité **régulière et sincère**.'));
add(B('Établir les **comptes annuels** selon le régime applicable (micro, réel simplifié, réel normal…).'));
add(B('==Conserver les documents comptables pendant 10 ans.=='));
add(H(4, '2) Facturer et conserver les documents : garder une trace des opérations'));
add(B('Établir des **factures** lorsque c\'est obligatoire.'));
add(B('Conserver les **pièces justificatives** des opérations réalisées.'));
add(B('Garder les documents **commerciaux et bancaires**.'));
add(H(4, '3) Respecter ses obligations professionnelles : permettre le suivi de l\'activité'));
add(B('**Obligations fiscales** : TVA, impôt sur le revenu ou sur les sociétés…'));
add(B('**Obligations sociales** : déclarations et paiement des cotisations…'));
add(B('**Obligations administratives** : déclarations, autorisations le cas échéant…'));

add(H(3, 'C. RNE, RCS et publicité légale'));
add(P('Une entreprise doit pouvoir être **identifiée par les tiers**. Trois dispositifs y contribuent :'));
add(table([2400, 4400, 2838], ['Dispositif', 'Fonction', 'Mot-clé'], [
  ['**RNE**', 'Identifier l\'entreprise : données d\'identification et informations relatives à l\'entreprise', '==RECENSER=='],
  ['**RCS**', 'Identifier l\'activité commerciale : inscription des commerçants et des sociétés relevant du registre', '==IMMATRICULER=='],
  ['[[Publicité légale]]', 'Informer les tiers : certaines informations et certains événements de la vie de l\'entreprise font l\'objet d\'une publicité', '==RENDRE L\'INFORMATION ACCESSIBLE=='],
]));
add(P('**Transparence → Confiance → Échanges économiques sécurisés.** Ces dispositifs réduisent l\'**asymétrie d\'information** et favorisent la confiance entre les acteurs économiques. //(Lien avec le chapitre 1 : « Instaurer la confiance entre les acteurs ».)//'));

add(H(3, 'Synthèse : Lucas est-il commerçant ?'));
add(table([3212, 3213, 3213], ['1. Qualifier l\'activité', '2. Qualifier la personne', '3. En déduire les conséquences'], [
  ['Que fait Lucas ? Il achète des produits pour les revendre → **acte de commerce par nature** (art. L.110-1). //Autres catégories : par la forme, par accessoire, acte mixte.//',
    'Lucas est-il commerçant ? Actes de commerce ✓, profession habituelle ✓, indépendance ✓, capacité (majeur ou mineur émancipé autorisé) ✓, absence d\'obstacle (interdiction, faillite personnelle…) ✓ → **qualité de commerçant** (art. L.121-1).',
    'Que doit faire Lucas ? **S\'immatriculer** (RNE et, selon les cas, RCS), **tenir une comptabilité**, **respecter ses obligations** fiscales, sociales et administratives. Application des règles du droit commercial : **preuve libre** (L.110-3), **tribunal de commerce** (L.721-3).'],
]));
add(P('**Notre raisonnement juridique :** ==Acte → Personne → Obligations== (Qualifier → Vérifier → En déduire les conséquences).'));

// ----- Points à retenir ch2 -----
add(H(2, 'Points à retenir – Chapitre 2'));
add(box('retenir', 'Points à retenir – Chapitre 2', [
  B('**Acte de commerce ≠ qualité de commerçant** : accomplir un acte de commerce ne suffit pas à devenir commerçant.'),
  B('**Acte de commerce** : opération à laquelle le droit reconnaît un caractère commercial (liste **non limitative** de l\'art. L.110-1). Trois fondements : **nature** (l\'objet de l\'opération), **forme** (ex. : lettre de change), **accessoire** (acte civil accompli par un commerçant pour les besoins de son commerce). L\'**acte mixte** est commercial pour une partie et civil pour l\'autre.'),
  B('**Achat pour revendre** : achat + intention de revendre **dès l\'achat** + intention spéculative (même si la revente se fait à perte).'),
  B('**Commerçant** (art. L.121-1) : 3 conditions cumulatives : **actes de commerce + profession habituelle + indépendance**.'),
  B('**Conditions tenant à la personne** : le mineur non émancipé ne peut pas être commerçant ; le mineur émancipé peut l\'être **sur autorisation du juge** (art. L.121-2). Obstacles pour les majeurs : **incapacité/protection, interdiction/déchéance, incompatibilité**.'),
  B('**Conséquences** : **liberté de la preuve** (L.110-3), **tribunal de commerce** (L.721-3), **obligations professionnelles**, **séparation des patrimoines** de l\'EI (les créanciers pros ont pour gage le patrimoine pro).'),
  B('**Obligations** : déclaration sur le **guichet unique** (R.123-220) ; **RNE** = toutes les entreprises (recenser) ; **RCS** = entreprises commerciales (immatriculer) ; **publicité légale** (informer les tiers) ; comptabilité régulière et sincère, documents conservés **10 ans**.'),
  B('**Les 5 articles clés** : L.110-1 (actes de commerce), L.121-1 (définition du commerçant), L.121-2 (mineur émancipé), L.110-3 (liberté de la preuve), L.721-3 (tribunal de commerce).'),
]));
add(pageBreak());

// =====================================================================
// CHAPITRE 3
// =====================================================================
const pending = (n) => box('remarque', 'À compléter', [`Ce chapitre ne contient pour l\'instant que vos notes personnelles. Il sera complété dès que vous m\'aurez envoyé les slides du chapitre ${n}.`]);

add(H(1, 'Chapitre 3 – Les éléments indispensables à l\'activité commerciale'));
add(box('exemple', 'Fil rouge : Lucas ouvre sa boutique !', [
  'Lucas loue un local commercial (« À louer ») et s\'apprête à ouvrir sa boutique.',
  '**Questions :** de quoi Lucas a-t-il besoin pour exercer son activité ? Quels éléments vont **vraiment** constituer son **fonds de commerce** ?',
]));
add(P('Point de départ : ==tout ce dont l\'entreprise a besoin ≠ son fonds de commerce==. Certains éléments en font partie, d\'autres non : le droit fait le tri pour **protéger la valeur créée par l\'activité**.'));
add(table([4819, 4819], ['Font partie du fonds', 'Ne font pas, en eux-mêmes, partie du fonds'], [
  ['**La clientèle** : les personnes qui choisissent mon commerce', '**Le local / les murs** : ils appartiennent au propriétaire, pas à Lucas'],
  ['**Le nom commercial** : il m\'identifie dans mon activité', '**Les salariés** : ils travaillent pour Lucas mais ne font pas partie de son fonds'],
  ['**L\'enseigne** : elle identifie mon établissement', '**Les fournisseurs** : ils fournissent Lucas mais n\'appartiennent pas à son fonds'],
  ['**Le matériel** : il me sert à exploiter mon activité', ''],
  ['**Les marchandises** : destinées à être vendues', ''],
]));

// ----- 1 -----
add(H(2, '1. La notion de fonds de commerce'));
add(H(3, 'A. La définition'));
add(P('Le [[fonds de commerce]] est ==un ensemble de biens mobiliers, corporels et incorporels, organisés par un commerçant pour exploiter une activité commerciale et attirer une clientèle==.'));
add(P('Décomposons la définition en **4 éléments** :'));
add(...N([
  '**Un ensemble de biens** : des éléments matériels ou immatériels qui ont une valeur (**corporels + incorporels**).',
  '**Organisés** : ces biens sont réunis et coordonnés par le commerçant, **dans un même but**.',
  '**Pour exploiter une activité commerciale** : ils permettent l\'exploitation d\'une activité commerciale de manière habituelle et indépendante ; **ils servent à l\'exploitation**.',
  '**Et attirer une clientèle** : leur finalité est d\'**attirer et de fidéliser** la clientèle, ==élément essentiel du fonds==.',
]));
add(box('remarque', 'À savoir', ['Le Code de commerce **ne donne pas de définition générale** du fonds de commerce.']));
add(P('**Ne pas confondre l\'entreprise et le fonds de commerce :**'));
add(table([4819, 4819], ['L\'entreprise', 'Le fonds de commerce'], [
  ['Une **activité économique organisée**', 'Un **ensemble de biens organisés** pour l\'exploitation d\'une activité commerciale'],
  ['Des personnes (salariés, dirigeant…), des moyens financiers, des moyens matériels, des relations avec des partenaires…', 'La clientèle, le matériel / les marchandises, le nom commercial / l\'enseigne, le droit au bail…'],
  ['→ **Une notion économique**, plus large', '→ **Une notion juridique**'],
]));

add(H(3, 'B. La nature juridique du fonds de commerce'));
add(P('Mais juridiquement, qu\'est-ce que le fonds lui-même ?'));
add(P('Des **éléments distincts** (clientèle, nom commercial, enseigne, matériel, marchandises, droit au bail) sont **réunis et organisés dans un même but économique**. On obtient :'));
add(B('une [[universalité de fait]] : des biens juridiquement distincts réunis par le commerçant dans un même but économique ;'));
add(B('qui constitue, pris dans son ensemble, un [[bien meuble incorporel]]. Certains de ses éléments sont corporels, mais **le fonds, lui, est incorporel**.'));
add(box('remarque', 'Le local / les murs ne font pas partie du fonds', [
  'Le local est un **immeuble** ; le fonds de commerce est un **bien meuble incorporel**. Lucas peut donc détenir l\'immeuble **et** le fonds de commerce : ce sont **deux biens distincts**.',
]));
add(box('remarque', 'Correction de vos notes', ['Vous aviez noté « bien meuble **matériel** ». Les slides le confirment : le fonds de commerce est un ==bien meuble incorporel==. C\'est un point classique de QCM.']));

// ----- 2 -----
add(H(2, '2. Les éléments du fonds de commerce'));
add(H(3, 'A. La clientèle : élément essentiel du fonds'));
add(P('La [[clientèle]] désigne l\'ensemble des **personnes attirées par l\'activité** du commerçant et qui achètent ses biens ou services. ==Sans clients, il n\'y a pas d\'activité commerciale à exploiter.=='));
add(P('C\'est l\'**élément essentiel** du fonds : les autres éléments n\'ont de valeur que parce qu\'ils permettent d\'**attirer et de fidéliser** une clientèle. Ils sont tous organisés autour d\'elle :'));
add(B('**Nom commercial** : permet d\'identifier l\'entreprise sur le marché.'));
add(B('**Enseigne** : permet d\'être repéré et d\'attirer les clients.'));
add(B('**Matériel** : permet de servir les clients et de réaliser l\'activité.'));
add(B('**Marchandises** : sont proposées à la vente aux clients.'));
add(B('**Droit au bail** : permet d\'occuper un emplacement pour attirer les clients.'));
add(P('**Pour qu\'il y ait fonds de commerce, la clientèle doit être :**'));
add(...N([
  '==Réelle et certaine== : elle doit **effectivement exister**. Une clientèle seulement hypothétique ou potentielle ne suffit pas.',
  '==Propre à l\'exploitant== : elle doit pouvoir être **rattachée à l\'activité du commerçant**.',
]));
add(box('article', 'Jurisprudence', [
  P('**Cass., ch. réunies, 24 avril 1970** : la clientèle propre conditionne l\'existence du fonds de commerce.', { run: { italics: true } }),
  P('**Cass. com., 4 mai 1999, n° 97-17.049** : la clientèle propre et personnelle constitue l\'élément essentiel du fonds de commerce. Sans clientèle, il n\'y a pas de fonds de commerce.', { run: { italics: true } }),
]));
add(box('exercice', 'Exercice du cours : Lucas dans la salle de sport', [
  'Lucas installe un espace de vente permanent **à l\'intérieur d\'une grande salle de sport**. La majorité de ses clients sont les **adhérents de la salle**. **Lucas a-t-il une clientèle propre ?**',
  '**Correction (raisonnement attendu) :** la clientèle doit être **propre** à l\'exploitant. Ici, les clients viennent d\'abord **pour la salle de sport** : la clientèle est attachée à la salle plutôt qu\'à Lucas. Si Lucas ne peut pas démontrer une clientèle **personnelle**, attirée par sa propre activité, il **n\'a pas de clientèle propre**, donc **pas de fonds de commerce**. C\'est exactement la situation de l\'arrêt du 24 avril 1970.',
]));

add(H(3, 'B. Le nom commercial et l\'enseigne'));
add(P('Lucas utilise « **Lucas Factory** » sur son site, ses documents et ses réseaux, puis l\'appose sur la façade de sa boutique. Comment qualifier ce signe ?'));
add(table([2500, 3700, 3438], ['Signe', 'Fonction', 'Exemple'], [
  ['[[Nom commercial]]', 'Identifie **l\'activité commerciale** : c\'est le nom sous lequel le commerçant exerce son activité et est connu de sa clientèle.', '« Lucas Factory » sur le site, les documents, les réseaux'],
  ['[[Enseigne]]', 'Identifie **l\'établissement** : elle permet notamment de repérer physiquement le lieu d\'exploitation.', '« Lucas Factory » sur la façade de la boutique'],
  ['[[Dénomination sociale]]', 'Identifie juridiquement **la société** : c\'est le nom sous lequel la société est immatriculée et agit.', 'Lucas crée une société : « LCM DISTRIBUTION SAS »'],
]));
add(P('==Un même signe peut remplir les deux fonctions== : « Lucas Factory » peut être à la fois le nom commercial de Lucas et l\'enseigne apposée sur sa boutique.'));
add(P('**Des signes protégés :** le nom commercial et l\'enseigne peuvent être protégés contre les usages créant un risque de confusion (notamment sur le terrain de la **concurrence déloyale**). //La protection des actifs immatériels sera étudiée plus tard (chapitre 9).//'));
add(box('retenir', 'Moyen mnémotechnique', [
  B('**Nom commercial** = activité commerciale → //qui exerce ? sous quel nom ?//'),
  B('**Enseigne** = établissement → //où est situé le commerce ?//'),
  B('**Dénomination sociale** = société → //qui est la personne morale ?//'),
]));

add(H(3, 'C. Le matériel et les marchandises'));
add(P('Tous les biens de la boutique sont **corporels**… mais ils n\'ont pas la même fonction :'));
add(table([4819, 4819], ['Le matériel / outillage', 'Les marchandises'], [
  ['Biens **utilisés durablement pour exploiter** l\'activité', 'Biens **destinés à être vendus**'],
  ['Chez Lucas : ordinateur, caisse, rayonnages / étagères, présentoir, mobilier', 'Chez Lucas : sacs à dos, gourdes, vêtements, accessoires, cartons de produits'],
  ['==Matériel = sert à exploiter==', '==Marchandises = destinées à être vendues=='],
]));
add(P('Deux fonctions **différentes et complémentaires**, avec un **objectif commun** : permettre à l\'entreprise d\'attirer et de satisfaire sa clientèle.'));
add(box('remarque', 'Attention', ['**Pour entrer dans le fonds, ces biens doivent appartenir au commerçant.** S\'ils sont seulement loués ou prêtés, ils n\'en font pas partie.']));
add(box('exercice', 'À vous de jouer : construisons le fonds de commerce de Lucas', [
  'Classez chaque élément : **dans le fonds** ou **pas dans le fonds** ? (1) Clientèle, (2) Nom commercial « Lucas Factory », (3) Enseigne « Lucas Factory », (4) Ordinateur appartenant à Lucas, (5) Stock de sacs à dos, (6) Murs de la boutique, (7) Salarié de Lucas, (8) Droit au bail.',
  '**Correction :**',
  B('**Dans le fonds** : 1, 2, 3, 4, 5 et **8** (clientèle, nom commercial, enseigne, matériel appartenant à Lucas, marchandises, droit au bail).'),
  B('**Pas dans le fonds** : 6 (les murs : le local n\'appartient pas à Lucas) et 7 (le salarié participe à l\'activité mais n\'est pas un bien du fonds).'),
  '**Zoom :** le local (les murs) n\'entre pas dans le fonds, **mais le droit au bail, oui**. Pourquoi ? Parce que le droit d\'occuper un emplacement peut avoir une valeur économique essentielle pour attirer et fidéliser la clientèle.',
]));

// ----- 3 -----
add(H(2, '3. Le droit au bail'));
add(H(3, 'A. Le bail commercial'));
add(P('Lucas n\'est pas propriétaire de sa boutique : il la **loue** pour y exploiter son commerce. Quel contrat lui permet d\'occuper ce local ?'));
add(table([4819, 4819], ['Bail commercial', 'Droit au bail'], [
  ['Le **contrat** conclu entre le propriétaire (**bailleur**) et le commerçant (**preneur** / locataire)', 'Le **droit** dont bénéficie le locataire dans le cadre de ce contrat'],
  ['Le bailleur met le local à disposition ; le preneur paie un loyer', 'Il peut constituer **un élément du fonds de commerce**'],
]));
add(P('==Bail commercial ≠ droit au bail== : l\'un est le contrat, l\'autre est le droit qui en découle.'));
add(P('**Un statut protecteur pour le commerçant** (articles L.145-1 et suivants du Code de commerce) :'));
add(B('[[Durée minimale du bail : 9 ans]] (art. L.145-4).'));
add(B('**Résiliation triennale** : le preneur peut, **en principe**, donner congé à l\'expiration de chaque période triennale (**3 ans, 6 ans**).'));
add(B('À **9 ans** : se pose la question du **renouvellement** du bail.'));
add(box('remarque', null, ['La faculté de résiliation triennale peut être écartée par certaines clauses prévues par la loi ou par accord des parties. Des exceptions existent.']));
add(art('Articles L.145-1 et suivants du Code de commerce', 'Les baux relatifs aux locaux dans lesquels est exploité un fonds de commerce sont soumis à un statut spécial et protecteur pour le locataire commerçant.'));
add(art('Article L.145-4 du Code de commerce', 'Le bail commercial est conclu pour une durée minimale de 9 ans. Le preneur peut, en principe, donner congé à l\'expiration de chaque période triennale.'));

add(H(3, 'B. Le droit au renouvellement'));
add(box('exemple', null, ['Lucas exploite sa boutique **depuis 9 ans**. Sa clientèle connaît bien l\'adresse et fréquente régulièrement ce local. Le propriétaire lui annonce : « Le bail est terminé. Je souhaite récupérer mon local. » **Que peut faire Lucas ?**']));
add(art('Article L.145-8 du Code de commerce', 'Le locataire commerçant qui remplit les conditions du statut bénéficie d\'un droit au renouvellement de son bail.'));
add(P('**À l\'expiration du bail (en principe après 9 ans), deux issues :**'));
add(table([4819, 4819], ['Renouvellement', 'Refus de renouvellement'], [
  ['Lucas **reste dans les lieux**', 'Lucas **doit quitter les lieux**'],
  ['→ **Continuité** de l\'exploitation de son commerce', '→ [[Indemnité d\'éviction]] ==en principe== (art. L.145-14)'],
]));
add(art('Article L.145-14 du Code de commerce', 'Le bailleur qui refuse le renouvellement du bail doit, en principe, verser au locataire une indemnité d\'éviction.'));
add(P('**Exception** : le bailleur peut, dans certaines hypothèses prévues par la loi, refuser le renouvellement **sans indemnité d\'éviction** (art. L.145-17). Exemples de motifs légaux (liste non exhaustive) : **reprise pour habiter**, **reconstruction de l\'immeuble**, **motif grave et légitime**, **transformation ou surélévation**…'));
add(box('complement', null, ['Précision : l\'article L.145-17 vise principalement le **motif grave et légitime** et l\'immeuble insalubre devant être démoli ; les autres hypothèses (reconstruction, reprise pour habiter…) sont réglées par les articles voisins (L.145-18 et suivants), parfois avec des conditions. Pour le QCM, retenez la présentation de la slide : **des exceptions limitativement prévues par la loi**.']));
add(P('**Pourquoi cette protection ?** Bon emplacement (attractif pour la clientèle) → clientèle fidèle (qui connaît et fréquente le lieu) → valeur du fonds (liée notamment à l\'emplacement). ==Le droit au renouvellement protège la stabilité de l\'exploitation commerciale.=='));
add(box('remarque', 'À ne pas confondre', ['==Droit au renouvellement ≠ renouvellement automatique.== Le bailleur peut refuser de renouveler le bail, mais il devra **en principe** verser une indemnité d\'éviction au locataire.', 'La valeur du droit au bail découle notamment de ce droit au renouvellement et de l\'indemnité d\'éviction en cas de refus.']));
add(box('exemple', 'Réponse pour Lucas', ['Lucas, commerçant qui remplit les conditions du statut, bénéficie d\'un **droit au renouvellement** (L.145-8). Si le propriétaire refuse, il doit **en principe** lui verser une **indemnité d\'éviction** (L.145-14), sauf motif légal de refus sans indemnité (L.145-17).']));

add(H(3, 'C. La valeur du droit au bail'));
add(box('exemple', null, ['Lucas envisage de **céder son fonds de commerce**. Un autre commerçant est prêt à payer davantage pour reprendre sa boutique située dans une rue très fréquentée. **Pourquoi est-il prêt à payer pour reprendre le droit au bail ?**']));
add(P('Le **droit au bail** = le droit d\'occuper un local dans le cadre d\'un bail commercial. ==Ce droit peut avoir une valeur économique pour l\'entreprise.== Elle dépend de **4 facteurs** :'));
add(...N([
  '**Emplacement** : un local bien situé (très passant, centre-ville, proximité d\'autres commerces…) peut favoriser l\'activité et son développement.',
  '**Clientèle** : la clientèle peut s\'être attachée à l\'emplacement au fil du temps. Perdre cette adresse peut faire perdre une partie de la clientèle.',
  '**Conditions du bail** : un loyer avantageux ou des conditions particulières (durée, charges, travaux à la charge du bailleur…) renforcent la valeur du droit au bail. //Ex. : loyer inférieur aux loyers pratiqués dans le secteur.//',
  '**Stabilité** : le statut des baux commerciaux protège le locataire (droit au renouvellement et, en principe, indemnité d\'éviction en cas de refus). Cette stabilité sécurise l\'exploitation.',
]));
add(P('==Cette valeur contribue à la valeur du fonds de commerce.== Le local (les murs) n\'appartient pas au fonds, mais **le droit de l\'occuper** peut avoir une valeur essentielle pour l\'exploitation.'));
add(art('Article L.145-16 du Code de commerce', 'Le droit au bail peut accompagner la cession du fonds de commerce. Les clauses qui interdisent au locataire de céder son bail avec le fonds sont réputées non écrites.'));
add(box('exercice', 'Exercice du cours : deux emplacements, deux valeurs ?', [
  '**Boutique A** : centre-ville, rue très passante, bonne visibilité, loyer de **1 200 €/mois**. **Boutique B** : rue peu fréquentée, visibilité limitée, loyer de **2 000 €/mois**. À activité identique, dans laquelle le droit au bail a-t-il le plus de valeur ?',
  '**Correction :** la **boutique A**. Elle cumule un **bon emplacement** (attractif pour la clientèle) et des **conditions de bail avantageuses** (loyer plus bas). Deux des quatre facteurs de valeur jouent en sa faveur.',
]));

// ----- Points à retenir ch3 -----
add(H(2, 'Points à retenir – Chapitre 3'));
add(box('retenir', 'Points à retenir – Chapitre 3', [
  B('**Fonds de commerce** : ensemble de biens mobiliers, corporels et incorporels, organisés par un commerçant pour exploiter une activité commerciale et **attirer une clientèle**. Le Code de commerce n\'en donne pas de définition générale.'),
  B('**Nature** : une **universalité de fait** (biens distincts réunis dans un même but) qui constitue un **bien meuble incorporel**.'),
  B('**Fonds de commerce ≠ entreprise** (notion économique plus large) **≠ local / murs** (un immeuble) **≠ salariés** **≠ fournisseurs**.'),
  B('**Éléments incorporels** : la **clientèle** (élément essentiel, qui doit être **réelle, certaine et propre** ; Cass. 24 avril 1970), le **nom commercial** (identifie l\'activité), l\'**enseigne** (identifie l\'établissement), le **droit au bail**. À distinguer de la **dénomination sociale** (identifie la société).'),
  B('**Éléments corporels** : le **matériel / outillage** (sert à exploiter) et les **marchandises** (destinées à être vendues). Ils doivent **appartenir** au commerçant.'),
  B('**Bail commercial** (le contrat) **≠ droit au bail** (le droit qui en découle, élément du fonds). Statut protecteur : art. **L.145-1** et s. ; durée minimale de **9 ans** avec résiliation **triennale** du preneur (L.145-4).'),
  B('**Droit au renouvellement** (L.145-8) **≠ renouvellement automatique** : en cas de refus, **indemnité d\'éviction** en principe (L.145-14), sauf exceptions légales (L.145-17).'),
  B('**Valeur du droit au bail** : emplacement, clientèle, conditions du bail, stabilité. Il peut être cédé avec le fonds : les clauses contraires sont **réputées non écrites** (L.145-16).'),
]));
add(pageBreak());

// =====================================================================
// CHAPITRE 4
// =====================================================================
add(H(1, 'Chapitre 4 – Contracter avec ses partenaires'));
add(box('exemple', 'Fil rouge : Lucas signe son premier contrat avec un fournisseur', [
  'Lucas est devenu commerçant (chapitre 2) et exploite un fonds de commerce (chapitre 3). Il doit maintenant **faire fonctionner son entreprise** : acheter des marchandises (fournisseur), faire créer son site (prestataire), livrer (transporteur), s\'équiper (fournisseur / loueur), se financer (banque) et vendre (clients professionnels et particuliers). **Point commun de toutes ces relations : le contrat.**',
  'Lucas choisit son premier fournisseur : **200 produits** (sacs et accessoires) à **20 € l\'unité**, **livraison le 15 octobre**, **paiement à 30 jours**. **À partir de quand Lucas et son fournisseur sont-ils juridiquement engagés ?**',
]));
add(P('Le chapitre suit la vie d\'une relation commerciale : ==Négocier → Contracter → Encadrer → Exécuter → Réagir → Rompre==.'));

// ----- 1 -----
add(H(2, '1. Les contrats dans la vie des affaires'));
add(P('Trois étapes : **discuter** (la négociation : prix, quantités, délais, modalités de paiement…) → **s\'accorder** (la formation du contrat : une offre est faite et acceptée) → **s\'engager** (le contrat produit ses effets : les parties sont juridiquement liées et doivent exécuter leurs engagements).'));
add(H(3, 'A. La liberté contractuelle'));
add(art('Article 1102 du Code civil', '« Chacun est libre de contracter ou de ne pas contracter, de choisir son cocontractant et de déterminer le contenu et la forme du contrat dans les limites fixées par la loi. »'));
add(P('La [[liberté contractuelle]] a **quatre dimensions** :'));
add(B('**Contracter ou non** (« Suis-je obligé de signer ? ») : Lucas est libre de décider s\'il conclut ou non un contrat.'));
add(B('**Choisir son partenaire** (« Avec quel fournisseur travailler ? ») : Lucas est libre de choisir son cocontractant.'));
add(B('**Déterminer le contenu** (prix, quantité, livraison, paiement) : Lucas et son partenaire sont libres de négocier les conditions de leur accord.'));
add(B('**Choisir la forme** (écrit, échange de mails, accord oral…) : le contrat peut en principe être conclu sous la forme choisie par les parties.'));
add(box('remarque', 'Une liberté qui n\'est pas absolue', [
  'La liberté contractuelle s\'exerce **dans les limites de la loi et du respect de l\'ordre public** :',
  B('**Discrimination interdite** : ex. refus de contracter en raison de l\'origine, du sexe…'),
  B('**Clause contraire à l\'ordre public** : ex. clause portant atteinte à une règle impérative.'),
  '==Liberté de contracter ≠ liberté de tout prévoir.==',
]));

add(H(3, 'B. La négociation et la formation du contrat'));
add(H(4, '1) La négociation et sa rupture'));
add(box('exemple', 'La rupture des négociations', ['(1) Lucas contacte un fournisseur : il recherche 200 produits. (2) Plusieurs échanges pendant **3 semaines** (prix, quantités, délais, paiement). (3) Le fournisseur **s\'engage** : il prépare la commande et **refuse une autre opportunité commerciale**. (4) **Lucas change d\'avis** et choisit un autre fournisseur. **Peut-il le faire ?**']));
add(art('Article 1112 du Code civil', '« L\'initiative, le déroulement et la rupture des négociations précontractuelles sont libres, mais ils doivent respecter les exigences de la bonne foi. »'));
add(P('**Principe :** les négociations sont libres… mais doivent respecter la ==bonne foi==.'));
add(B('**Liberté** : négocier, échanger, mettre fin aux discussions.'));
add(B('**Bonne foi** : un comportement loyal et sincère.'));
add(B('**Responsabilité** : en cas de **rupture fautive** des négociations.'));
add(P('//Vos notes : « Responsabilité civile / pénale ».// Les slides précisent qu\'il s\'agit de la ==responsabilité civile== : la partie fautive doit réparer le préjudice causé. Il n\'est pas question de responsabilité pénale ici.'));
add(box('exemple', 'Réponse pour Lucas', ['Lucas est **libre** de rompre les négociations. Mais s\'il rompt de façon **déloyale** (tardivement, sans motif, alors que le fournisseur a engagé des frais et refusé une autre opportunité), il peut engager sa **responsabilité civile** pour rupture fautive.']));
add(box('complement', null, ['En cas de rupture fautive, la réparation ne peut pas compenser **la perte des avantages attendus du contrat non conclu** (art. 1112, al. 2 du Code civil). On indemnise la faute dans la rupture, pas le contrat manqué.']));

add(H(4, '2) Les devoirs pendant la négociation'));
add(table([4819, 4819], ['L\'obligation d\'information (art. 1112-1 C. civ.)', 'Le devoir de confidentialité (art. 1112-2 C. civ.)'], [
  ['Celui qui connaît une information dont l\'importance est **déterminante pour le consentement** de l\'autre partie doit l\'en informer dès lors que, légitimement, cette dernière ignore cette information ou fait confiance à son cocontractant.', 'Celle des parties qui reçoit une **information confidentielle** à l\'occasion des négociations doit en **conserver le caractère confidentiel**.'],
  ['//Exemples : caractéristiques essentielles du produit, risques connus (vices, défauts), contraintes réglementaires.//', '//Exemples : projet commercial de Lucas, données financières, stratégie de développement.//'],
]));
add(P('**Conséquences en cas de manquement :** la partie qui ne respecte pas ces obligations peut voir sa ==responsabilité civile== engagée. //Comportements fautifs : dissimuler une information déterminante, réutiliser des informations confidentielles.//'));

add(H(4, '3) La formation du contrat : l\'offre et l\'acceptation'));
add(table([3212, 3213, 3213], ['1. L\'offre', '2. L\'acceptation', '3. Le contrat est formé'], [
  ['Une **proposition ferme et précise**. //« Je vous propose 200 produits à 20 € l\'unité, livraison sous 15 jours. »//', 'Un **accord sans réserve**. //« J\'accepte votre proposition. »//', 'Les parties sont **juridiquement liées**.'],
  ['Volonté d\'être lié ; contenu suffisamment précis ; destinataire déterminé ; délai de validité (éventuel)', 'Conforme à l\'offre ; expresse ou tacite ; dans le délai de validité ; sans modification', 'La rencontre d\'une offre et d\'une acceptation crée un lien juridique entre les parties.'],
]));
add(art('Articles 1113 et 1114 du Code civil', '« Le contrat est formé par la rencontre d\'une offre et d\'une acceptation. » L\'acceptation doit être pure et simple. Elle peut être expresse ou tacite.'));
add(P('**Réponse à la question du fil rouge :** Lucas et son fournisseur sont engagés ==dès la rencontre de l\'offre et de l\'acceptation==, sans qu\'il soit nécessaire de signer un document.'));

add(H(3, 'C. La souplesse des formes et la liberté de la preuve'));
add(box('exemple', null, ['Lucas : « Je n\'ai rien signé… mais nous avons échangé plusieurs mails ! » Le fournisseur : « La commande était bien confirmée ! » (échanges de mails, bon de commande, facture).']));
add(table([4819, 4819], ['1. Le contrat est-il valable ? (la forme)', '2. Peut-on prouver le contrat ? (la preuve)'], [
  [['**Principe :** le [[consensualisme]] (art. 1172 C. civ.) : ==l\'accord des volontés suffit en principe==.', '**L\'écrit n\'est pas une condition générale de validité**, sous réserve des contrats pour lesquels la loi impose une forme particulière (ex. : acte notarié, écrit obligatoire…).'],
   ['**Droit civil** (principe général) : écrit en principe exigé au-delà du seuil légal (**art. 1359 C. civ.**, 1 500 €). Certaines preuves peuvent être admises (commencement de preuve par écrit, exceptions…).', '**Vie des affaires** (actes de commerce) : ==preuve par tous moyens== à l\'égard des commerçants (**art. L.110-3 C. com.**). //Exemples : mails, facture, bon de commande, échanges de messages, documents commerciaux.//']],
]));
add(box('remarque', 'À ne pas confondre', ['==Validité du contrat ≠ preuve du contrat.== La validité répond à la question « le contrat existe-t-il juridiquement ? » ; la preuve à la question « puis-je démontrer son existence et son contenu ? ». //(Lien avec le chapitre 1 : la preuve, et le chapitre 2 : la liberté de la preuve entre commerçants.)//']));

// ----- 2 -----
add(H(2, '2. L\'encadrement de la relation commerciale'));
add(H(3, 'A. Les conditions générales de vente (CGV)'));
add(P('Lucas reçoit les CGV de son fournisseur : « Je dois vraiment lire tout ça ? » Oui ! Elles contiennent les **prix et réductions** (prix unitaire, remises, conditions tarifaires), les **conditions de paiement** (délai, modes de règlement, escompte), la **livraison** (délais, transport, transfert des risques) et les règles en cas de **retard de paiement** (pénalités, indemnité forfaitaire).'));
add(...N([
  '**Un cadre commun** : les [[CGV]] organisent les conditions applicables aux ventes de produits ou de services. Elles constituent ==le socle unique de la négociation commerciale== (art. L.441-1 C. com.).',
  '**Une communication au client professionnel** : lorsqu\'elles sont établies, les CGV doivent être communiquées au professionnel qui en fait la demande pour les besoins de son activité, **sur un support durable** (papier, e-mail, espace client…).',
  '**Pour être opposables**, les CGV doivent avoir été ==portées à la connaissance de Lucas== **et** ==acceptées par lui== (art. 1119 C. civ.).',
]));

add(H(3, 'B. Les principales obligations des parties'));
add(P('Le contrat crée des **obligations réciproques** : des marchandises contre un prix. C\'est un échange équilibré et encadré par le droit.'));
add(table([4819, 4819], ['Le fournisseur (vendeur) : art. 1603 et s. C. civ.', 'Lucas (acheteur) : art. 1650 et s. C. civ.'], [
  ['**Délivrer** : remettre les biens convenus', '**Payer le prix** : au montant convenu'],
  ['**Conformément au contrat** : produit, quantité, qualité, délai', '**Payer à l\'échéance** : respecter le délai prévu'],
  ['**Garantir** : notamment contre les vices cachés', '**Prendre livraison** : réceptionner les marchandises'],
]));
add(art('Article 1103 du Code civil', 'Le contrat fait la loi des parties : les contrats légalement formés tiennent lieu de loi à ceux qui les ont faits. Ce qui a été convenu doit être exécuté (**force obligatoire**).'));
add(art('Article 1104 du Code civil', 'Les contrats doivent être négociés, formés et exécutés de bonne foi : loyauté, coopération, comportement conforme aux engagements.'));
add(box('exemple', 'Exemple concret', ['Contrat : 200 produits, 20 €/unité, livraison le 15 octobre. Le fournisseur livre les 200 produits… **le 25 octobre**. A-t-il correctement exécuté le contrat ? **Non** : c\'est une exécution **tardive** (voir partie 3). ==Conclure un contrat = prendre des engagements juridiquement obligatoires.==']));

add(H(3, 'C. Les relations avec les fournisseurs et les clients professionnels : facturation et délais de paiement'));
add(P('Le circuit : **livraison** (remise des marchandises) → **facture** (établie par le fournisseur, ex. 200 × 20 € = 4 000 €) → **échéance** (date limite de paiement) → **paiement** (par Lucas). « Payer mon fournisseur, oui… mais pas n\'importe quand ! »'));
add(H(4, '1) La facture : une obligation entre professionnels'));
add(P('Tout achat de produits ou toute prestation de services **pour une activité professionnelle** doit faire l\'objet d\'une **facturation** (art. L.441-9 C. com.). Le **vendeur délivre** la facture, l\'**acheteur la réclame**.'));
add(P('Principales mentions : identité, date, produits/services, quantité, prix, échéance. ==Facture ≠ contrat== : elle constate et accompagne l\'opération commerciale.'));
add(H(4, '2) Quand Lucas doit-il payer ? (art. L.441-10 C. com.)'));
add(P('==Entre professionnels, le délai de paiement n\'est pas illimité.=='));
add(table([3212, 6426], ['Situation', 'Délai'], [
  ['**Si rien n\'est prévu**', '**30 jours** après réception des marchandises ou exécution de la prestation'],
  ['**Si les parties conviennent d\'un délai**', '**60 jours maximum** à compter de la date d\'émission de la facture, **ou 45 jours fin de mois** si ce délai est expressément prévu et ne constitue pas un abus manifeste'],
]));
add(H(4, '3) Et si Lucas paie en retard ?'));
add(P('Le retard de paiement entraîne des **conséquences automatiques** : ==pénalités de retard + indemnité forfaitaire de 40 € pour frais de recouvrement==, **exigibles sans rappel préalable** (art. L.441-10 et D.441-5 C. com.).'));

// ----- 3 -----
add(H(2, '3. L\'exécution de la relation commerciale'));
add(P('Et si tout ne se passe pas comme prévu (livraison en retard, marchandises non livrées, prestation mal exécutée, facture impayée) ? Trois temps : **A. Exécuter** (qu\'a-t-on promis ?) → **B. Réagir** (quels moyens d\'action ?) → **C. Rompre** (peut-on arrêter librement ?).'));
add(H(3, 'A. L\'exécution des engagements contractuels'));
add(H(4, '1) L\'exécution doit être conforme à ce qui a été convenu'));
add(table([2400, 4838, 2400], ['Type d\'exécution', 'Exemple (commande : 200 produits pour le 15 octobre)', 'Résultat'], [
  ['**Conforme**', '200 produits livrés le 15 octobre, conformes à la commande', '✓ Contrat exécuté'],
  ['**Partielle**', '180 produits au lieu de 200', '✗ Mal exécuté'],
  ['**Imparfaite**', '200 produits, mais pas ceux commandés (mauvaise qualité, produits différents)', '✗ Mal exécuté'],
  ['**Tardive**', '200 produits livrés le 25 octobre au lieu du 15', '✗ Mal exécuté'],
]));
add(H(4, '2) Le contrat doit être exécuté de bonne foi (art. 1104 C. civ.)'));
add(P('Comportement loyal, coopération, information en cas de difficulté, recherche de solutions. **Mais attention :** la bonne foi ne permet pas de réécrire librement le contrat ; elle s\'exerce dans le respect des engagements pris.'));
add(H(4, '3) La mise en demeure : demander l\'exécution de l\'obligation'));
add(P('La [[mise en demeure]] : le créancier **interpelle formellement** le débiteur pour lui demander d\'exécuter.'));
add(B('**Comment ?** Par écrit (lettre, e-mail…), avec une demande claire d\'exécution et le rappel de l\'obligation non respectée.'));
add(B('**À quoi ça sert ?** Constater l\'inexécution, donner une dernière chance d\'exécuter. Elle est souvent nécessaire avant d\'autres actions.'));
add(B('**À retenir** : pas de formalisme imposé ; ce qui compte, c\'est une interpellation suffisamment claire. Un écrit est fortement conseillé pour conserver la preuve.'));

add(H(3, 'B. Les conséquences de l\'inexécution'));
add(P('« Mon fournisseur n\'a pas respecté ses engagements… Que puis-je faire ? » ==La boîte à outils du créancier (art. 1217 C. civ.)== offre **5 solutions** :'));
add(table([2600, 4100, 2938], ['Sanction', 'Contenu', 'Exemple'], [
  ['**1. Suspendre sa propre obligation** : l\'[[exception d\'inexécution]] (art. 1219)', 'Refuser d\'exécuter sa propre obligation tant que l\'autre partie n\'exécute pas la sienne. Suppose une inexécution **suffisamment grave**.', 'Le fournisseur n\'a pas livré : Lucas peut refuser de payer.'],
  ['**2. Exiger l\'exécution** : l\'[[exécution forcée en nature]] (art. 1221)', 'Obtenir exactement ce qui était prévu dans le contrat, **en principe après mise en demeure**.', 'Lucas peut demander la livraison des 200 produits.'],
  ['**3. Obtenir une** [[réduction du prix]] (art. 1223)', 'Lorsque la prestation est imparfaite mais acceptée : réduction **proportionnelle** du prix.', '180 produits livrés au lieu de 200 : Lucas peut demander une réduction du prix.'],
  ['**4. Mettre fin au contrat** : la [[résolution]] (art. 1224 à 1227)', 'En cas d\'inexécution **suffisamment grave**. Peut résulter d\'une **clause résolutoire**, d\'une **notification** ou d\'une **décision du juge**.', 'Le fournisseur ne livre toujours pas malgré la mise en demeure : Lucas peut demander la résolution.'],
  ['**5. Obtenir réparation** : les [[dommages et intérêts]] (art. 1231-1)', 'Indemnisation du préjudice subi. Il faut prouver **le préjudice, le lien de causalité et la faute** du débiteur (sauf force majeure).', 'Le retard de livraison a empêché Lucas d\'ouvrir sa boutique à la date prévue.'],
]));
add(box('retenir', 'À retenir', [
  B('L\'inexécution **n\'entraîne pas automatiquement** la disparition du contrat.'),
  B('Le créancier dispose de **plusieurs moyens d\'action**, qu\'il choisit en fonction de sa situation.'),
  B('Certaines solutions **peuvent se cumuler** (ex. : résolution + dommages et intérêts).'),
  B('**Et la** [[force majeure]] **?** Le débiteur n\'est pas responsable si l\'inexécution résulte d\'un événement **extérieur, imprévisible et irrésistible** (art. 1218 C. civ.).'),
]));

add(H(3, 'C. La rupture de la relation commerciale établie'));
add(box('exemple', null, ['Lucas travaille avec son fournisseur depuis **5 ans** (commandes régulières de 2021 à 2025 : une relation stable, régulière et habituelle). Il trouve un autre fournisseur avec de meilleures conditions : « Puis-je arrêter du jour au lendemain ? » → **Arrêt immédiat des commandes ?**']));
add(art('Article L.442-1, II du Code de commerce', 'Engage la responsabilité de son auteur le fait de rompre brutalement, même partiellement, une relation commerciale établie, en l\'absence d\'un préavis écrit suffisant.'));
add(...N([
  '**Qu\'est-ce qu\'une** [[relation commerciale établie]] **?** Une relation **stable** (dans la durée), **régulière** (des commandes répétées) et **habituelle** (une certaine continuité). ==Une commande isolée ne suffit pas.==',
  '**Le principe :** un ==préavis écrit suffisant==. Informer son partenaire à l\'avance pour lui permettre de s\'organiser : rechercher de nouveaux clients, adapter sa production, réorganiser ses approvisionnements, éventuellement ses effectifs.',
  '**Combien de temps ?** Pas de durée unique, tout dépend de la situation : durée de la relation, usages du commerce ou accords interprofessionnels, circonstances de l\'espèce. **Le chiffre de 18 mois** n\'est pas un délai obligatoire : c\'est un **seuil de sécurisation**. Lorsqu\'un préavis de 18 mois est respecté, la responsabilité de l\'auteur de la rupture ne peut pas être engagée au titre d\'une durée insuffisante.',
  '**Des exceptions : rupture sans préavis** en cas d\'**inexécution par l\'autre partie de ses obligations** ou de **force majeure**.',
  '**Les conséquences d\'une rupture brutale** : l\'auteur de la rupture peut voir sa responsabilité engagée et être condamné à réparer le préjudice causé par le **caractère brutal** de la rupture, notamment en raison de l\'insuffisance du préavis. ==On n\'indemnise pas la rupture en elle-même, mais la brutalité de la rupture.==',
]));
add(box('remarque', 'À bien distinguer', [
  '**Inexécution d\'un contrat** (que faire face au manquement ?) → **Code civil** (art. 1217 et s.).',
  '**≠ Rupture d\'une relation établie** (comment mettre fin à une relation durable ?) → **Code de commerce** (art. L.442-1, II).',
]));
add(box('exemple', 'Réponse pour Lucas', ['Après 5 ans de commandes régulières, la relation est **établie**. Lucas peut changer de fournisseur, mais **pas du jour au lendemain** : il doit respecter un **préavis écrit suffisant**, sinon il engage sa responsabilité pour **rupture brutale**.']));

// ----- Points à retenir ch4 -----
add(H(2, 'Points à retenir – Chapitre 4'));
add(box('retenir', 'Points à retenir – Chapitre 4', [
  B('**Problématique** : le droit accompagne la relation commerciale de sa **négociation** jusqu\'à son **exécution** et, le cas échéant, jusqu\'à sa **rupture** (Négocier → Contracter → Encadrer → Exécuter → Réagir).'),
  B('**Liberté contractuelle** (art. 1102) : contracter ou non, choisir son partenaire, le contenu et la forme… **dans les limites de la loi et de l\'ordre public**.'),
  B('**Négociations** libres mais de **bonne foi** (art. 1112) ; **obligation d\'information** (1112-1) et **confidentialité** (1112-2). Rupture fautive → **responsabilité civile**.'),
  B('**Formation** : le contrat naît de la **rencontre d\'une offre et d\'une acceptation** (art. 1113-1114). **Consensualisme** (art. 1172) : l\'écrit n\'est pas une condition de validité. **Validité ≠ preuve** ; entre commerçants, **preuve libre** (L.110-3).'),
  B('**CGV** : socle unique de la négociation commerciale (L.441-1) ; **opposables** si connues et acceptées (art. 1119).'),
  B('**Obligations** : le vendeur délivre une chose conforme et la garantit (1603) ; l\'acheteur paie et prend livraison (1650). **Force obligatoire** (1103) et **bonne foi** (1104).'),
  B('**Facture** obligatoire entre pros (L.441-9). **Délais** (L.441-10) : 30 jours par défaut, 60 jours max. date de facture ou 45 jours fin de mois. Retard → pénalités + **40 €** d\'indemnité forfaitaire (D.441-5).'),
  B('**Inexécution** (art. 1217) : exception d\'inexécution (1219), exécution forcée (1221), réduction du prix (1223), résolution (1224-1227), dommages et intérêts (1231-1), cumulables. Exonération en cas de **force majeure** (1218). Mise en demeure souvent préalable.'),
  B('**Rupture d\'une relation commerciale établie** (L.442-1, II) : **préavis écrit suffisant** (18 mois = seuil de sécurisation) ; on indemnise la **brutalité**, pas la rupture.'),
]));
add(pageBreak());

// =====================================================================
// CHAPITRE 5
// =====================================================================
add(H(1, 'Chapitre 5 – Se faire payer et financer son activité'));
add(box('exemple', 'Fil rouge : Lucas achète du matériel à crédit', [
  'Lucas développe son activité ! Pour répondre à la demande de ses clients, il souhaite acheter du **matériel professionnel**.',
  'Coût du matériel : **20 000 €** − trésorerie disponible : **5 000 €** = ==besoin de financement : 15 000 €==. **Comment financer ?**',
]));
add(P('Une décision économique (investir, se développer, faire face à ses besoins) entraîne plusieurs questions juridiques : ==une décision financière est aussi une décision juridique.== Le chapitre suit trois étapes :'));
add(table([3212, 3213, 3213], ['1. Payer et se faire payer', '2. Financer', '3. Sécuriser'], [
  ['Régler ses dettes, obtenir le paiement de ses créances', 'Trouver les ressources nécessaires à l\'activité', 'Réduire le risque de non-paiement'],
  ['Comment organiser les flux d\'argent ? Quels moyens de paiement ? À quelle date payer ? Que faire en cas d\'impayé ?', 'Comment obtenir les ressources nécessaires ? Crédit bancaire, crédit-bail, affacturage, autres modes de financement', 'Comment limiter le risque de non-paiement ? Pourquoi une garantie ? Sûretés personnelles, sûretés réelles'],
]));

// ----- 1 -----
add(H(2, '1. Le paiement dans les relations d\'affaires'));
add(art('Article 1342 du Code civil', '« Le paiement est l\'exécution volontaire de la prestation due. »'));
add(P('==Payer = exécuter l\'obligation due.== Le [[paiement]] ne se limite donc pas à verser de l\'argent : c\'est l\'exécution de ce qui est dû. Mais comment effectuer **concrètement** un paiement ?'));

add(H(3, 'A. Les principaux moyens de paiement'));
add(table([1700, 2400, 2000, 3538], ['Moyen', 'Qui déclenche le paiement ?', 'Quand ?', 'Particularités'], [
  ['**Virement**', 'Le **débiteur** (qui donne l\'ordre de virement à sa banque)', 'Immédiat ou programmé', 'Transfert de fonds de compte à compte ; adapté aux montants importants'],
  ['**Prélèvement**', 'Le **bénéficiaire** (sur autorisation préalable du débiteur)', 'À l\'échéance prévue (paiements réguliers ou ponctuels)', 'Nécessite un **mandat de prélèvement** ; souvent utilisé pour des paiements récurrents ; le débiteur doit disposer des fonds'],
  ['**Carte bancaire**', 'Le **débiteur** (qui initie le paiement)', 'Lors du paiement (débit immédiat ou différé selon la carte)', 'Paiement en présentiel ou à distance ; plafonds de paiement'],
  ['**Chèque**', 'Le **débiteur** (qui remet le chèque)', '**Payable à vue** (à la présentation)', '==La remise du chèque ≠ paiement définitif== : la créance subsiste jusqu\'au paiement effectif (art. L.131-67 C. mon. fin.)'],
  ['**Lettre de change**', 'Le **tireur** (qui donne l\'ordre de payer au tiré)', 'À l\'échéance indiquée sur le titre', 'Instrument de **paiement et de crédit** (elle permet de différer le paiement) ; trois acteurs : **tireur, tiré, bénéficiaire** ; **acte de commerce par la forme**'],
]));
add(box('remarque', 'Lien avec le chapitre 2', ['Vous retrouvez la **lettre de change**, l\'exemple type de l\'**acte de commerce par la forme** (art. L.110-1, 10° C. com.) : elle est commerciale quelle que soit la personne qui la signe.']));

add(H(3, 'B. L\'échéance et le retard de paiement'));
add(...N([
  '**La facture** constate la créance du vendeur à l\'égard de son client.',
  '**Le délai de paiement** entre professionnels (art. L.441-10 C. com.) : **30 jours** après réception des marchandises ou exécution de la prestation à défaut d\'accord ; **60 jours maximum** à compter de l\'émission de la facture si les parties en conviennent ; ou **45 jours fin de mois** si c\'est expressément prévu et non manifestement abusif. Des régimes particuliers existent pour certaines activités ou certains produits.',
  'L\'[[échéance]] marque le moment où le paiement doit intervenir. Tant que cette date n\'est pas dépassée, le débiteur bénéficie du délai qui lui a été accordé.',
  '**Le retard de paiement** : si l\'échéance est dépassée sans paiement, le débiteur est en retard. Conséquences **automatiques** entre professionnels : ==pénalités de retard== (exigibles à compter du jour suivant la date de règlement figurant sur la facture) et ==indemnité forfaitaire de 40 €== pour frais de recouvrement (due de plein droit, art. D.441-5 C. com.).',
]));
add(P('==L\'échéance transforme la créance en somme à payer. Le retard produit des conséquences juridiques.== //(Rappel du chapitre 4, partie 2.C.)//'));

add(H(3, 'C. Le recouvrement des créances impayées'));
add(P('L\'échéance est dépassée… mais le paiement n\'arrive toujours pas. Que peut faire le créancier ? Une ==action progressive en 5 étapes== :'));
add(table([2400, 7238], ['Étape', 'Contenu'], [
  [['**Recouvrement amiable**', '//(obtenir le paiement sans saisir le juge)//'], ''],
  ['**1. Relance amiable**', 'Rappel du montant dû et de la date d\'échéance, par courrier, e-mail, appel téléphonique… Objectif : obtenir une régularisation rapide. C\'est souvent un simple oubli ou un problème administratif.'],
  ['**2.** [[Mise en demeure]]', 'Interpellation **formelle** du débiteur, par lettre recommandée, acte de commissaire de justice (huissier)… (art. 1344 C. civ.). //La mise en demeure n\'est pas nécessaire pour les pénalités de retard entre professionnels.//'],
  [['**Recouvrement judiciaire / exécution**', '//(faire reconnaître son droit puis obtenir le paiement)//'], ''],
  ['**3.** [[Injonction de payer]]', 'Demande au juge d\'ordonner le paiement d\'une somme due. Procédure **simple et rapide** (art. 1405 et s. du Code de procédure civile). Conditions : créance **déterminée, exigible**, généralement issue d\'un contrat.'],
  ['**4.** [[Titre exécutoire]]', 'Décision de justice (ex. : ordonnance d\'injonction de payer non contestée) qui constate une créance **certaine, liquide et exigible** et permet de recourir à l\'exécution forcée. ==Sans titre exécutoire, pas d\'exécution forcée.=='],
  ['**5. Exécution forcée**', 'Mise en œuvre de mesures d\'exécution (**saisies**…), selon les procédures du Code des procédures civiles d\'exécution, avec l\'intervention d\'un **commissaire de justice**.'],
]));
add(box('complement', null, ['Une créance **certaine** existe sans contestation possible ; **liquide**, son montant est connu (chiffré) ; **exigible**, son échéance est arrivée. Le **commissaire de justice** est le nouveau nom (depuis 2022) de l\'huissier de justice.']));

// ----- 2 -----
add(H(2, '2. Le financement de l\'entreprise'));
add(H(3, 'A. Les besoins de financement'));
add(P('==Le besoin de financement naît d\'un décalage entre les ressources disponibles et les besoins de l\'entreprise.== Identifier le besoin, c\'est choisir la solution la plus adaptée. Trois grands besoins :'));
add(table([2600, 4300, 2738], ['Besoin', 'Contenu', 'Exemples'], [
  ['**1. Investir**', 'Financer des biens destinés à être **utilisés durablement** par l\'entreprise.', 'Matériel et équipements, local, véhicule, actifs immatériels (logiciels, brevets…). //Lucas : son besoin de 15 000 € est un besoin d\'investissement.//'],
  ['**2. Financer le cycle d\'exploitation**', 'Faire face au **décalage** entre les dépenses et les encaissements : achats → stocks → ventes → facturation → encaissements. ==Décalage dans le temps = besoin de trésorerie.== L\'entreprise doit financer ses dépenses avant d\'avoir encaissé ses recettes.', 'Payer les fournisseurs avant que les clients ne paient'],
  ['**3. Se développer / faire face à un besoin ponctuel**', 'Accompagner une nouvelle étape de l\'activité ou faire face à une situation particulière.', 'Lancer un nouveau produit, recruter, ouvrir un point de vente, besoin temporaire de trésorerie (baisse d\'activité)'],
]));
add(P('**Deux sources de financement :**'));
add(B('**Le financement interne** : l\'entreprise mobilise **ses propres ressources** : les **résultats conservés** (autofinancement : bénéfices non distribués réinvestis) et la **trésorerie disponible**. ==Pas de dette nouvelle envers un financeur externe.== //Lucas dispose de 5 000 € d\'économies, mais cela ne couvre pas les 20 000 € : il doit chercher 15 000 € à l\'extérieur.//'));
add(B('**Le financement externe** : les ressources proviennent **de l\'extérieur** de l\'entreprise.'));
add(table([4819, 4819], ['A. L\'endettement', 'B. Les apports en capital'], [
  ['Des sommes mises à disposition **qui devront être remboursées** : prêt bancaire, crédit-bail, affacturage, autres financements créant une obligation de remboursement.', 'Des ressources apportées **par les associés ou des investisseurs** : apport des associés (création, augmentation de capital), investisseurs (business angels, fonds d\'investissement…).'],
  ['→ Le financeur devient **créancier** de l\'entreprise.', '→ En contrepartie, l\'investisseur obtient **des droits dans l\'entreprise** (associé, actionnaire…).'],
  ['==DETTE = rembourser== : le financeur récupère les sommes prêtées.', '==CAPITAL = devenir associé / investisseur== : le financeur participe au capital et **prend un risque**.'],
]));

add(H(3, 'B. Le crédit bancaire'));
add(P('La banque prête de l\'argent, mais à quelles conditions ? Quelle est la relation juridique entre la banque et l\'entreprise ?'));
add(art('Article L.313-1 du Code monétaire et financier', '« Une opération de crédit consiste notamment, pour une personne agissant à titre onéreux, à mettre ou promettre de mettre des fonds à la disposition d\'une autre personne. » La définition est plus large : elle vise également certains engagements par signature (aval, cautionnement, garantie…).'));
add(table([4819, 4819], ['La banque (établissement de crédit)', 'L\'entreprise'], [
  ['**Financeur – créancier**', '**Emprunteur – débiteur**'],
  ['Met des fonds à la disposition de l\'entreprise, **à titre onéreux** : la banque verse le montant du crédit.', 'Reçoit les fonds et s\'engage à les rembourser (le **capital**, selon les modalités du contrat), **avec les intérêts et les frais**.'],
]));
add(P('**Les 5 éléments d\'un crédit :**'));
add(table([2000, 2600, 5038], ['Élément', 'Question', 'Contenu'], [
  ['**1. Le capital**', 'Quelle somme est empruntée ?', 'Montant mis à disposition par la banque, qui devra être remboursé.'],
  ['**2. La durée**', 'Pendant combien de temps ?', '**Court terme** (moins d\'1 an), **moyen terme** (1 à 7 ans), **long terme** (plus de 7 ans). Durée adaptée au besoin financé.'],
  ['**3. Les échéances**', 'Quand rembourser ?', 'Modalités de remboursement (principal et intérêts) ; échéances périodiques (mensuelles, trimestrielles…) selon un échéancier prévu au contrat.'],
  ['**4. Les intérêts**', 'Quel est le prix du crédit ?', 'Rémunération de la banque en contrepartie de la mise à disposition des fonds. **Art. 1905 et 1907 C. civ.** : possibilité de stipuler des intérêts ; le **taux conventionnel doit être fixé par écrit**.'],
  ['**5. Les frais**', 'Quels autres coûts ?', 'Frais de dossier, frais de garantie, assurance emprunteur éventuelle, autres frais liés au financement.'],
]));
add(P('**Capital + durée + échéances + coût →** ==capacité de remboursement== : la banque vérifie la capacité de l\'entreprise à honorer ses engagements dans le temps.'));
add(box('exemple', 'Lucas emprunte 15 000 €', ['Il ne paiera pas seulement 15 000 € : il remboursera le **capital, augmenté des intérêts et des frais**, selon le calendrier prévu.', '==15 000 € empruntés ≠ 15 000 € à décaisser immédiatement.== Le crédit crée une **dette future de remboursement**. Obtenir un crédit, ce n\'est pas seulement recevoir des fonds : c\'est organiser leur remboursement dans le temps.']));
add(box('complement', null, ['Le prêt d\'argent est un **prêt de consommation** (art. 1892 et s. C. civ.) : l\'emprunteur peut consommer la chose prêtée (l\'argent) à charge d\'en rendre autant.']));

add(H(3, 'C. Panorama des autres modes de financement'));
add(P('Le crédit bancaire est-il la seule solution ? **Non.**'));
add(table([2400, 4400, 2838], ['Mode', 'Fonctionnement', 'À retenir'], [
  ['**1. Le** [[crédit-bail]] //(financer l\'utilisation d\'un bien)//', 'Une **société de crédit-bail achète le bien** (matériel ou autre) ; l\'entreprise **le loue** en contrepartie de loyers, avec une **option d\'achat en fin de contrat** (art. L.313-7 C. mon. fin.).', '==L\'entreprise utilise le bien sans en être immédiatement propriétaire.=='],
  ['**2. L\'**[[affacturage]] //(financer la trésorerie grâce aux créances clients)//', 'L\'entreprise cède ses factures clients (créances commerciales à encaisser) à un **factor** (société d\'affacturage) qui **rachète les créances** : les fonds sont disponibles plus rapidement. Le factor peut aussi assurer, selon le contrat, la gestion et le recouvrement des créances.', '==L\'entreprise mobilise ses créances sans attendre leur échéance.=='],
  ['**3. Le** [[financement participatif]] //(crowdfunding)//', 'Collecter des fonds auprès d\'une **pluralité de contributeurs** (particuliers, investisseurs…) via une **plateforme**. Trois formes : **don** (pas de remboursement en principe), **prêt** (remboursement du capital et éventuellement d\'intérêts), **investissement** (souscription de titres donnant des droits dans l\'entreprise).', 'Les contributeurs financent un projet précis.'],
]));
add(box('retenir', 'Quel financement pour quel besoin ?', [
  B('Besoin d\'un **équipement** → **crédit-bail**.'),
  B('Besoin de **trésorerie** / créances en attente → **affacturage**.'),
  B('Besoin de financer un **projet auprès de contributeurs** → **financement participatif**.'),
]));
add(P('**La logique du financement :** 1. besoin de financement → 2. choix d\'un financement (crédit bancaire, crédit-bail, affacturage, participatif, ressources propres…) → 3. mise à disposition de ressources → 4. ==créance de remboursement== (le financeur devient créancier) → 5. ==risque de non-remboursement== (baisse d\'activité, impayés, trésorerie insuffisante…). C\'est ce risque qui justifie la partie 3.'));

// ----- 3 -----
add(H(2, '3. La sécurisation du financement'));
add(H(3, 'A. La fonction des garanties'));
add(P('Pourquoi le créancier cherche-t-il à **se protéger** ?'));
add(H(4, '1) Le principe : le droit de gage général'));
add(art('Articles 2284 et 2285 du Code civil', 'Art. 2284 : « Le débiteur répond de ses engagements sur tous ses biens, présents et à venir. » Art. 2285 : « Les biens du débiteur constituent le gage commun de ses créanciers. »'));
add(P('Le [[droit de gage général]] : tout le patrimoine du débiteur (biens présents et à venir) répond de ses dettes envers **tous** ses créanciers.'));
add(P('Un [[créancier chirographaire]] est un créancier qui **ne bénéficie pas d\'une sûreté particulière** : il dispose d\'un droit contre le débiteur, **aucun bien déterminé n\'est affecté à son paiement**, et il est payé avec les autres créanciers, selon les règles applicables.'));
add(H(4, '2) Les limites de cette protection'));
add(P('**Un même patrimoine pour plusieurs créanciers** (banque, fournisseur, État, salariés…) :'));
add(B('le patrimoine peut être **insuffisant** pour payer tous les créanciers ;'));
add(B('certains créanciers bénéficient de **causes légitimes de préférence** (ex. : **privilèges**), ce qui **fragilise** la position du créancier chirographaire.'));
add(H(4, '3) Le rôle d\'une sûreté'));
add(P('**Sans sûreté** : créancier chirographaire = protection générale. **Avec sûreté** : ==position juridique renforcée en cas de défaillance du débiteur==. Comment renforcer la position du créancier ? Grâce à **une personne** ou **un bien** :'));
add(table([4819, 4819], ['Sûreté personnelle = une PERSONNE', 'Sûreté réelle = un BIEN'], [
  ['**Une personne supplémentaire s\'engage** envers le créancier (ex. : un proche de Lucas). La protection repose sur **l\'engagement d\'une autre personne**.', '**Un bien est affecté en garantie** (immeuble, matériel, créances, fonds de commerce…). La protection repose sur **un bien spécialement affecté** à la garantie de la créance.'],
  ['//Exemples : cautionnement, garantie autonome, lettre d\'intention.//', '//Exemples : gage, nantissement, hypothèque.//'],
]));

add(H(3, 'B. Les principales sûretés personnelles'));
add(H(4, '1) Le cautionnement : « Je paierai s\'il ne paie pas »'));
add(art('Article 2288 du Code civil', '« Le cautionnement est le contrat par lequel une caution s\'oblige envers le créancier à payer la dette du débiteur en cas de défaillance de celui-ci. »'));
add(box('exemple', null, ['**Dette principale** : Lucas (débiteur principal) doit rembourser 15 000 € à la banque. **Engagement de caution** : un proche (la [[caution]]) s\'engage envers la banque à payer la dette de Lucas en cas de défaillance de celui-ci. **Si Lucas ne paie pas**, la banque peut, dans les conditions du cautionnement, demander le paiement à la caution.']));
add(P('**À retenir :**'));
add(B('Le [[cautionnement]] est une **sûreté personnelle**.'));
add(B('La caution **garantit la dette d\'un autre** (le débiteur principal).'));
add(B('La caution **ne remplace pas** le débiteur principal : il reste tenu de rembourser.'));
add(B('Le cautionnement est ==accessoire== : il dépend de l\'existence d\'une dette principale.'));
add(box('remarque', 'Attention', ['==Caution ≠ débiteur principal.== La caution n\'emprunte pas l\'argent : elle s\'engage à payer **si** le débiteur principal ne paie pas.']));
add(P('**Cautionnement simple ou solidaire ?** Lucas ne rembourse plus son crédit : que peut faire la banque ?'));
add(table([4819, 4819], ['Cautionnement simple', 'Cautionnement solidaire'], [
  ['Le créancier doit **d\'abord poursuivre le débiteur principal** sur ses biens. Si le débiteur ne paie pas ou si ses biens sont insuffisants, il peut alors demander le paiement à la caution.', 'Le créancier peut **agir directement contre la caution**, dans les limites de son engagement, sans devoir poursuivre préalablement le débiteur principal.'],
  [['[[Bénéfice de discussion]] : la caution peut, sous conditions, demander au créancier de poursuivre d\'abord les biens du débiteur principal.', '[[Bénéfice de division]] : s\'il existe plusieurs cautions, chacune peut, sous conditions, demander que les poursuites soient divisées entre elles.'], 'La caution **renonce** aux bénéfices de discussion et de division.'],
  ['→ ==Protection plus importante de la caution==', '→ ==Protection plus importante du créancier=='],
]));
add(box('remarque', 'Se porter caution est un véritable engagement juridique !', ['La caution s\'engage à payer la dette d\'un autre en cas de défaillance de celui-ci. Le droit encadre strictement la formation du cautionnement (**formalisme, information**) pour protéger la caution. Tous les cautionnements ne produisent pas les mêmes effets.']));
add(H(4, '2) La garantie autonome : « Je paierai selon mon propre engagement »'));
add(art('Article 2321 du Code civil', '« La garantie autonome est l\'engagement par lequel un garant s\'oblige, en considération d\'une obligation souscrite par un tiers, à verser une somme soit à première demande, soit selon les modalités convenues. »'));
add(P('Le débiteur (Lucas) demande la garantie ; le **garant** (une société, un proche) s\'engage de manière autonome envers le **bénéficiaire** (la banque), à première demande ou selon les modalités convenues. ==Un engagement indépendant de l\'obligation garantie.=='));
add(H(4, '3) La lettre d\'intention : « Je m\'engage à soutenir le débiteur »'));
add(art('Article 2322 du Code civil', '« La lettre d\'intention est l\'engagement de faire ou de ne pas faire ayant pour objet le soutien apporté à un débiteur dans l\'exécution de son obligation envers son créancier. »'));
add(P('Une **société mère ou un tiers** (ex. : un partenaire) s\'engage envers le débiteur à faire ou ne pas faire (soutien financier, maintien d\'un soutien…). **Effet indirect** : cela renforce la confiance du créancier. ==Un engagement de faire ou de ne pas faire ayant pour objet le soutien du débiteur.=='));
add(box('retenir', 'Trois mécanismes, une même finalité', [
  'Renforcer la position du créancier grâce à **l\'engagement d\'une personne**. À distinguer :',
  B('**Cautionnement** = ==accessoire== (dépend de la dette principale).'),
  B('**Garantie autonome** = ==autonome== (indépendante de la dette garantie).'),
  B('**Lettre d\'intention** = ==engagement de soutien== (faire ou ne pas faire).'),
]));

add(H(3, 'C. Les principales sûretés réelles'));
add(P('« Je peux utiliser un bien de mon entreprise pour obtenir un financement plus facilement ? » Le débiteur **affecte un bien** (ou un ensemble de biens) en garantie de la créance.'));
add(art('Article 2323 du Code civil', 'La [[sûreté réelle]] est l\'affectation d\'un bien ou d\'un ensemble de biens, présents ou futurs, au paiement préférentiel ou exclusif du créancier.'));
add(P('Les sûretés réelles confèrent au créancier des **prérogatives particulières**, notamment :'));
add(B('le [[droit de préférence]] : être **payé prioritairement** sur la valeur du bien, selon le rang applicable ;'));
add(B('le [[droit de suite]] : dans certaines sûretés, pouvoir exercer la sûreté **sur le bien même lorsqu\'il a été transmis** à un tiers.'));
add(P('**Trois principales sûretés réelles selon la nature du bien garanti :**'));
add(table([1900, 2580, 2580, 2578], ['', 'Gage', 'Nantissement', 'Hypothèque'], [
  ['**Sur quoi ?**', '==Bien meuble corporel== (bien matériel)', '==Bien meuble incorporel== (droit)', '==Immeuble== (bien immobilier)'],
  ['**Exemples**', 'Véhicule, matériel, machine, ordinateur…', 'Créance, **fonds de commerce**, marques, titres…', 'Local professionnel, bâtiment, terrain…'],
  ['**Référence**', 'Art. 2333 C. civ.', 'Art. 2355 C. civ.', 'Art. 2393 et s. C. civ.'],
  ['**Intérêt pour le créancier**', 'Droit de préférence ; dans certains cas, droit de suite', 'Droit de préférence ; dans certains cas, droit de suite', 'Droit de préférence ; dans certains cas, droit de suite'],
]));
add(box('remarque', 'Lien avec le chapitre 3', ['Le **fonds de commerce** est un **bien meuble incorporel** : il ne peut donc pas être « gagé » ou « hypothéqué », il fait l\'objet d\'un ==nantissement==. C\'est une question piège classique !']));
add(box('exercice', 'Exercice du cours : quelle sûreté ?', [
  '(1) Un proche de Lucas s\'engage à payer sa dette s\'il devient défaillant. (2) Une banque obtient une garantie portant sur une machine appartenant au débiteur. (3) Une société s\'engage, indépendamment de la dette principale, à verser une somme au bénéficiaire selon les modalités convenues. (4) Une créance professionnelle est affectée en garantie d\'un financement. (5) Une société mère prend un engagement de soutien à l\'égard de sa filiale débitrice. (6) Un immeuble est affecté en garantie d\'un emprunt.',
  '**Correction :** on raisonne d\'abord : **une personne ou un bien ?** Puis on qualifie.',
  B('(1) **Cautionnement** : une personne garantit la dette d\'un autre (sûreté personnelle, accessoire).'),
  B('(2) **Gage** : une machine = bien meuble corporel (sûreté réelle).'),
  B('(3) **Garantie autonome** : engagement indépendant de la dette principale (sûreté personnelle).'),
  B('(4) **Nantissement** : une créance = bien meuble incorporel (sûreté réelle).'),
  B('(5) **Lettre d\'intention** : engagement de soutien (sûreté personnelle).'),
  B('(6) **Hypothèque** : un immeuble (sûreté réelle).'),
]));
add(P('**Sécuriser le financement, la logique à retenir :** un financement est accordé → une créance de remboursement naît → il existe un risque de défaillance → le créancier cherche à renforcer sa position grâce à une sûreté (personnelle ou réelle) → la créance est sécurisée.'));
add(box('remarque', 'Attention', ['==Une sûreté ne garantit pas que le débiteur paiera== : elle **renforce la position du créancier** en cas de défaillance. **Sécuriser ≠ supprimer le risque** ; sécuriser = renforcer la position du créancier.']));

// ----- Points à retenir ch5 -----
add(H(2, 'Points à retenir – Chapitre 5'));
add(box('retenir', 'Points à retenir – Chapitre 5', [
  B('**Logique du chapitre** : ==Payer → Financer → Sécuriser==. Une décision financière est aussi une décision juridique.'),
  B('**Paiement** = exécution volontaire de la prestation due (art. 1342). Moyens : virement, prélèvement (mandat), carte, **chèque** (la remise ≠ paiement définitif, art. L.131-67 C. mon. fin.), **lettre de change** (paiement + crédit, 3 acteurs, acte de commerce par la forme).'),
  B('**Échéance et retard** : délais de L.441-10 C. com. (30 j / 60 j / 45 j fin de mois) ; retard → pénalités dès le lendemain + **40 €** (D.441-5), sans mise en demeure.'),
  B('**Recouvrement progressif** : relance amiable → **mise en demeure** (art. 1344) → **injonction de payer** (art. 1405 et s. CPC) → **titre exécutoire** (créance certaine, liquide, exigible) → **exécution forcée** (saisies, commissaire de justice).'),
  B('**Besoins de financement** : investir, financer le cycle d\'exploitation (trésorerie), se développer. Financement **interne** (autofinancement, trésorerie) ou **externe** : **dette** (rembourser) ≠ **capital** (devenir associé, prendre un risque).'),
  B('**Crédit bancaire** (L.313-1 C. mon. fin.) : banque créancière, entreprise débitrice ; capital, durée, échéances, intérêts (art. 1905 et 1907 : taux fixé par écrit), frais → capacité de remboursement. 15 000 € empruntés ≠ 15 000 € décaissés.'),
  B('**Autres financements** : **crédit-bail** (L.313-7 : utiliser un bien sans en être propriétaire, option d\'achat), **affacturage** (céder ses créances à un factor), **financement participatif** (don, prêt, investissement).'),
  B('**Droit de gage général** (art. 2284-2285) : le créancier **chirographaire** n\'a aucune sûreté et subit le concours des autres créanciers.'),
  B('**Sûretés personnelles** (une **personne**) : **cautionnement** (art. 2288, accessoire ; simple = bénéfices de discussion et de division ; solidaire = le créancier agit directement contre la caution), **garantie autonome** (art. 2321, autonome), **lettre d\'intention** (art. 2322, soutien).'),
  B('**Sûretés réelles** (un **bien**, art. 2323) : droit de **préférence** et parfois droit de **suite**. **Gage** = meuble corporel (2333) ; **nantissement** = meuble incorporel (2355), dont le fonds de commerce ; **hypothèque** = immeuble (2393 et s.).'),
  B('**Une sûreté ne supprime pas le risque** : elle renforce la position du créancier.'),
]));
add(pageBreak());

// =====================================================================
// GLOSSAIRE
// =====================================================================
add(H(1, 'Glossaire'));
add(H(2, 'Les articles de loi'));
const chLink = (n) => link(toc.find(t => t.text.startsWith(`Chapitre ${n}`)).id, `Ch. ${n}`);
const cellLinks = (...ns) => new Paragraph({ children: ns.flatMap((n, i) => i ? [new TextRun(' · '), chLink(n)] : [chLink(n)]) });
const ART_W = [1500, 2000, 4938, 1200];
add(P('Articles **cités dans les slides** (à connaître pour le QCM), classés par code :'));
add(H(3, 'Code civil'));
add(table(ART_W, ['Article', 'Thème', 'Contenu', 'Chapitre'], [
  ['**1102**', 'Liberté contractuelle', '« Chacun est libre de contracter ou de ne pas contracter, de choisir son cocontractant et de déterminer le contenu et la forme du contrat dans les limites fixées par la loi. »', cellLinks(4)],
  ['**1103**', 'Force obligatoire', 'Les contrats légalement formés tiennent lieu de loi à ceux qui les ont faits.', cellLinks(4)],
  ['**1104**', 'Bonne foi', 'Les contrats doivent être négociés, formés et exécutés de bonne foi.', cellLinks(4)],
  ['**1112**', 'Négociations', 'L\'initiative, le déroulement et la rupture des négociations sont libres mais doivent respecter la bonne foi.', cellLinks(4)],
  ['**1112-1**', 'Devoir d\'information', 'Obligation d\'informer l\'autre partie d\'une information déterminante pour son consentement, qu\'elle ignore légitimement.', cellLinks(4)],
  ['**1112-2**', 'Confidentialité', 'Celui qui reçoit une information confidentielle pendant les négociations doit la garder confidentielle.', cellLinks(4)],
  ['**1113-1114**', 'Offre et acceptation', 'Le contrat est formé par la rencontre d\'une offre et d\'une acceptation ; l\'acceptation est pure et simple, expresse ou tacite.', cellLinks(4)],
  ['**1119**', 'Opposabilité des CGV', 'Les conditions générales ne sont opposables que si elles ont été portées à la connaissance de l\'autre partie et acceptées par elle.', cellLinks(4)],
  ['**1172**', 'Consensualisme', 'Les contrats sont en principe consensuels : l\'échange des consentements suffit.', cellLinks(4)],
  ['**1217**', 'Sanctions de l\'inexécution', 'Liste des moyens d\'action du créancier face à l\'inexécution (la « boîte à outils »).', cellLinks(4)],
  ['**1218**', 'Force majeure', 'Événement extérieur, imprévisible et irrésistible qui exonère le débiteur.', cellLinks(4)],
  ['**1219**', 'Exception d\'inexécution', 'Suspendre sa propre obligation si l\'autre n\'exécute pas la sienne et que l\'inexécution est suffisamment grave.', cellLinks(4)],
  ['**1221**', 'Exécution forcée', 'Obtenir l\'exécution en nature de l\'obligation, après mise en demeure.', cellLinks(4)],
  ['**1223**', 'Réduction du prix', 'Réduction proportionnelle du prix en cas d\'exécution imparfaite acceptée.', cellLinks(4)],
  ['**1224 à 1227**', 'Résolution', 'Mettre fin au contrat en cas d\'inexécution suffisamment grave (clause résolutoire, notification ou décision du juge).', cellLinks(4)],
  ['**1231-1**', 'Dommages et intérêts', 'Réparation du préjudice causé par l\'inexécution, sauf force majeure.', cellLinks(4)],
  ['**1342**', 'Paiement', '« Le paiement est l\'exécution volontaire de la prestation due. »', cellLinks(5)],
  ['**1344**', 'Mise en demeure', 'Le débiteur est mis en demeure par une sommation, un acte portant interpellation suffisante ou, si le contrat le prévoit, par la seule exigibilité de l\'obligation.', cellLinks(5)],
  ['**1359**', 'Preuve par écrit', 'L\'acte juridique portant sur une somme excédant un montant fixé par décret (**1 500 €**) doit être prouvé par écrit.', cellLinks(1, 2, 4)],
  ['**1603** et s.', 'Obligations du vendeur', 'Délivrer la chose (conforme) et la garantir (notamment contre les vices cachés).', cellLinks(4)],
  ['**1650** et s.', 'Obligations de l\'acheteur', 'Payer le prix au jour et au lieu convenus (et prendre livraison).', cellLinks(4)],
  ['**1905 et 1907**', 'Intérêts du prêt', 'Il est permis de stipuler des intérêts pour un prêt d\'argent ; le taux conventionnel doit être fixé par écrit.', cellLinks(5)],
  ['**2284 et 2285**', 'Droit de gage général', 'Le débiteur répond de ses engagements sur tous ses biens, présents et à venir ; ses biens sont le gage commun de ses créanciers.', cellLinks(5)],
  ['**2288**', 'Cautionnement', 'Contrat par lequel une caution s\'oblige envers le créancier à payer la dette du débiteur en cas de défaillance de celui-ci.', cellLinks(5)],
  ['**2321**', 'Garantie autonome', 'Engagement d\'un garant de verser une somme à première demande ou selon les modalités convenues, en considération de l\'obligation d\'un tiers.', cellLinks(5)],
  ['**2322**', 'Lettre d\'intention', 'Engagement de faire ou de ne pas faire ayant pour objet le soutien apporté à un débiteur.', cellLinks(5)],
  ['**2323**', 'Sûreté réelle', 'Affectation d\'un bien ou d\'un ensemble de biens au paiement préférentiel ou exclusif du créancier.', cellLinks(5)],
  ['**2333**', 'Gage', 'Sûreté réelle portant sur un bien meuble corporel.', cellLinks(5)],
  ['**2355**', 'Nantissement', 'Sûreté réelle portant sur un bien meuble incorporel (créance, fonds de commerce…).', cellLinks(5)],
  ['**2393** et s.', 'Hypothèque', 'Sûreté réelle portant sur un immeuble.', cellLinks(5)],
]));
add(H(3, 'Code de commerce'));
add(table(ART_W, ['Article', 'Thème', 'Contenu', 'Chapitre'], [
  ['**L.110-1**', 'Actes de commerce', 'Liste non limitative des actes de commerce : achat de biens pour les revendre (1°), intermédiaires, manufacture, transport, banque… et lettres de change entre toutes personnes (10°).', cellLinks(2, 5)],
  ['**L.110-3**', 'Liberté de la preuve', '« À l\'égard des commerçants, les actes de commerce peuvent se prouver par tous moyens […] »', cellLinks(1, 2, 4)],
  ['**L.121-1**', 'Commerçant', '« Sont commerçants ceux qui exercent des actes de commerce et en font leur profession habituelle. »', cellLinks(2)],
  ['**L.121-2**', 'Mineur émancipé', 'Peut être commerçant sur autorisation du juge au moment de l\'émancipation ou du président du tribunal judiciaire ensuite.', cellLinks(2)],
  ['**R.123-220**', 'Guichet unique', 'Les déclarations relatives aux entreprises se font par un formulaire dématérialisé unique sur le guichet unique.', cellLinks(2)],
  ['**L.145-1** et s.', 'Statut des baux commerciaux', 'Statut spécial et protecteur pour le locataire commerçant qui exploite un fonds dans les locaux loués.', cellLinks(3)],
  ['**L.145-4**', 'Durée du bail', 'Durée minimale de 9 ans ; le preneur peut en principe donner congé à chaque période triennale.', cellLinks(3)],
  ['**L.145-8**', 'Droit au renouvellement', 'Le locataire qui remplit les conditions du statut a droit au renouvellement de son bail.', cellLinks(3)],
  ['**L.145-14**', 'Indemnité d\'éviction', 'Le bailleur qui refuse le renouvellement doit en principe verser une indemnité d\'éviction.', cellLinks(3)],
  ['**L.145-16**', 'Cession du bail', 'Les clauses interdisant de céder le bail avec le fonds sont réputées non écrites.', cellLinks(3)],
  ['**L.145-17**', 'Refus sans indemnité', 'Le bailleur peut, dans des cas prévus par la loi (ex. : motif grave et légitime), refuser le renouvellement sans indemnité.', cellLinks(3)],
  ['**L.441-1**', 'CGV', 'Les CGV constituent le socle unique de la négociation commerciale ; communication au professionnel qui les demande.', cellLinks(4)],
  ['**L.441-9**', 'Facturation', 'Tout achat ou prestation pour une activité professionnelle doit faire l\'objet d\'une facture (mentions obligatoires).', cellLinks(4)],
  ['**L.441-10**', 'Délais de paiement', '30 jours par défaut ; 60 jours max. à compter de la facture ou 45 jours fin de mois ; pénalités de retard.', cellLinks(4, 5)],
  ['**D.441-5**', 'Indemnité forfaitaire', 'Indemnité forfaitaire pour frais de recouvrement de **40 €** en cas de retard de paiement.', cellLinks(4, 5)],
  ['**L.442-1, II**', 'Rupture brutale', 'Engage la responsabilité de son auteur la rupture brutale d\'une relation commerciale établie sans préavis écrit suffisant.', cellLinks(4)],
  ['**L.721-3**', 'Tribunal de commerce', 'Compétent pour les litiges entre commerçants, relatifs aux sociétés commerciales et aux actes de commerce.', cellLinks(2)],
]));
add(H(3, 'Code monétaire et financier'));
add(table(ART_W, ['Article', 'Thème', 'Contenu', 'Chapitre'], [
  ['**L.131-67**', 'Chèque', 'La remise d\'un chèque en paiement n\'entraîne pas novation : la créance subsiste jusqu\'au paiement effectif.', cellLinks(5)],
  ['**L.313-1**', 'Opération de crédit', 'Mettre ou promettre de mettre, à titre onéreux, des fonds à la disposition d\'une autre personne (ou prendre un engagement par signature).', cellLinks(5)],
  ['**L.313-7**', 'Crédit-bail', 'Location d\'un bien acheté par une société de crédit-bail, avec option d\'achat en fin de contrat.', cellLinks(5)],
]));
add(H(3, 'Code de procédure civile'));
add(table(ART_W, ['Article', 'Thème', 'Contenu', 'Chapitre'], [
  ['**1405** et s.', 'Injonction de payer', 'Procédure simple et rapide pour obtenir du juge qu\'il ordonne le paiement d\'une créance déterminée et exigible, d\'origine contractuelle.', cellLinks(5)],
]));
add(H(3, 'Jurisprudence'));
add(table(ART_W, ['Décision', 'Thème', 'Solution', 'Chapitre'], [
  ['**Cass., ch. réunies, 24 avril 1970**', 'Clientèle propre', 'La clientèle propre conditionne l\'existence du fonds de commerce.', cellLinks(3)],
  ['**Cass. com., 4 mai 1999, n° 97-17.049**', 'Clientèle propre', 'La clientèle propre et personnelle est l\'élément essentiel du fonds : sans clientèle, pas de fonds de commerce.', cellLinks(3)],
]));
add(P('**Compléments** : articles **non cités dans les slides**, ajoutés pour éclairer vos notes de cours :'));
add(table(ART_W, ['Article', 'Code', 'Contenu', 'Chapitre'], [
  ['**Art. 55**', 'Constitution', 'Les traités régulièrement ratifiés ont une **autorité supérieure à celle des lois** (sous réserve de réciprocité).', cellLinks(1)],
  ['**Art. 413-2**', 'Code civil', 'Le mineur peut être **émancipé** à partir de **16 ans** révolus, par décision du juge des tutelles.', cellLinks(2)],
  ['**Art. 1353**', 'Code civil', '**Charge de la preuve** : celui qui réclame l\'exécution d\'une obligation doit la prouver ; celui qui se prétend libéré doit justifier le paiement ou le fait qui a éteint son obligation.', cellLinks(1)],
  ['**Art. 1358**', 'Code civil', 'Hors les cas où la loi en dispose autrement, la preuve peut être apportée **par tout moyen**.', cellLinks(1)],
  ['**Art. 1360**', 'Code civil', 'Exceptions à l\'écrit : **impossibilité matérielle ou morale** de se procurer un écrit, usage, perte de l\'écrit par force majeure.', cellLinks(1)],
  ['**L.210-1**', 'Code de commerce', 'Sont **commerciales par leur forme**, quel que soit leur objet : SNC, sociétés en commandite simple, SARL et sociétés par actions (SA, SAS…).', cellLinks(2)],
  ['**L.526-22**', 'Code de commerce', 'L\'**entrepreneur individuel** a un **patrimoine professionnel** (biens, droits, obligations et sûretés utiles à son activité) distinct de son patrimoine personnel.', cellLinks(2)],
]));

add(H(2, 'Les notions clés'));
const notions = [
  ['Acte civil', 'Acte qui ne relève pas du droit commercial (ex. : achat d\'un ordinateur par Lucas pour son usage personnel).'],
  ['Acte de commerce', 'Opération à laquelle le droit reconnaît un caractère commercial ; la qualification dépend de l\'opération réalisée.'],
  ['Acte de commerce par accessoire', 'Acte normalement civil qui devient commercial car accompli par un commerçant pour les besoins de son activité commerciale (« l\'accessoire suit le principal »).'],
  ['Acte de commerce par la forme', 'Acte commercial du fait de sa forme juridique, indépendamment de l\'activité de son auteur (ex. : lettre de change).'],
  ['Acte de commerce par nature', 'Acte commercial du fait de son objet (ex. : achat pour revendre, transport, banque).'],
  ['Acte juridique', 'Manifestation de volonté destinée à produire des effets de droit (ex. : un contrat).'],
  ['Acte mixte', 'Acte commercial pour une partie et civil pour l\'autre (ex. : vente B2C entre Lucas et Emma).'],
  ['Activité artisanale', 'Activité fondée sur le travail personnel et le savoir-faire (production, transformation, réparation, services).'],
  ['Activité commerciale', 'Activité dont la logique dominante est d\'acheter pour revendre.'],
  ['Activité économique', 'Toute activité impliquant une transaction : contracter, financer, vendre, se développer, protéger.'],
  ['Activité libérale', 'Prestation intellectuelle ou technique exercée de manière indépendante.'],
  ['Arrêt confirmatif / infirmatif', 'Décision de la cour d\'appel qui reprend (confirmatif) ou modifie (infirmatif) la solution du premier jugement.'],
  ['Arrêt de rejet / de cassation', 'Décision de la Cour de cassation qui maintient (rejet) ou annule (cassation) la décision d\'appel.'],
  ['Charge de la preuve', 'Obligation de prouver ce que l\'on avance ; pèse en principe sur celui qui réclame (souvent le demandeur).'],
  ['Commerçant', 'Personne qui accomplit des actes de commerce, en fait sa profession habituelle et agit de manière indépendante (art. L.121-1).'],
  ['Directive (UE)', 'Acte européen qui fixe un objectif à atteindre et doit être transposé en droit national.'],
  ['Droit civil', 'Droit commun des relations privées (contrats, obligations, responsabilité).'],
  ['Droit commercial', 'Règles spéciales adaptées à la vie des affaires (commerçants, actes de commerce, fonds de commerce).'],
  ['Droit des affaires', 'Ensemble des règles juridiques qui encadrent les activités économiques et leurs acteurs ; « droit carrefour ».'],
  ['Droit primaire (UE)', 'Traités fondateurs de l\'Union européenne.'],
  ['Droit souple', 'Sources non contraignantes qui orientent les comportements (recommandations, lignes directrices, chartes, labels).'],
  ['Fait juridique', 'Événement, volontaire ou non, qui produit des effets de droit non recherchés (ex. : un accident) ; se prouve par tout moyen.'],
  ['Fonds de commerce', 'Ensemble de biens mobiliers, corporels et incorporels, organisé par un commerçant pour exploiter une activité commerciale et attirer une clientèle.'],
  ['Guichet unique', 'Site en ligne (formalites.entreprises.gouv.fr) où sont accomplies les formalités des entreprises.'],
  ['Hiérarchie des normes', 'Pyramide de Kelsen : Constitution > traités > lois > règlements ; chaque norme respecte celles qui lui sont supérieures.'],
  ['Incompatibilité', 'Interdiction de cumuler certaines fonctions (fonctionnaire, avocat, magistrat…) avec une activité commerciale.'],
  ['Intention spéculative', 'Recherche d\'un bénéfice au moment de l\'achat ; ne suppose pas que le bénéfice soit réellement réalisé.'],
  ['Interdiction / déchéance', 'Sanction écartant une personne du commerce (ex. : faillite personnelle).'],
  ['Jurisprudence', 'Ensemble des décisions rendues par les tribunaux ; le juge interprète, précise et fait évoluer la règle.'],
  ['Lettre de change', 'Effet de commerce : acte de commerce par la forme, quelle que soit la personne qui la signe.'],
  ['Liberté de la preuve', 'Possibilité de prouver par tous moyens (écrit, courriel, facture, témoignage) ; principe entre commerçants.'],
  ['Mineur émancipé', 'Mineur (16 ans au moins) libéré de l\'autorité parentale ; peut être commerçant sur autorisation du juge.'],
  ['Patrimoine professionnel', 'Biens, droits, obligations et sûretés de l\'EI utiles à son activité ; gage des créanciers professionnels.'],
  ['Publicité légale', 'Diffusion obligatoire de certaines informations sur l\'entreprise pour informer les tiers.'],
  ['RCS', 'Registre du commerce et des sociétés, tenu par les greffes des tribunaux de commerce : commerçants et sociétés commerciales.'],
  ['Règlement (national)', 'Norme prise par le pouvoir exécutif (décrets, arrêtés) fixant les modalités et règles techniques.'],
  ['Règlement (UE)', 'Acte européen directement applicable dans tous les États membres (ex. : RGPD).'],
  ['RGPD', 'Règlement général sur la protection des données : règlement européen directement applicable à toutes les entreprises.'],
  ['RNE', 'Répertoire national des entreprises : identifie toutes les entreprises, quel que soit leur statut ou leur activité.'],
  ['Tribunal de commerce', 'Juridiction spécialisée dans les litiges liés à la vie des affaires (engagements entre commerçants, sociétés commerciales, actes de commerce).'],
  ['Usages professionnels', 'Pratiques répétées, non écrites, reconnues comme obligatoires dans un secteur ou une profession.'],
  ['Acceptation', 'Accord pur et simple à une offre, exprès ou tacite, dans le délai de validité ; forme le contrat.'],
  ['Bail commercial', 'Contrat par lequel le bailleur (propriétaire) met un local à disposition d\'un commerçant (preneur) contre un loyer ; durée minimale de 9 ans.'],
  ['Bien meuble incorporel', 'Bien qui n\'est ni un immeuble ni une chose matérielle ; c\'est la nature juridique du fonds de commerce.'],
  ['Bonne foi', 'Exigence de loyauté et de sincérité dans la négociation, la formation et l\'exécution du contrat (art. 1104).'],
  ['CGV', 'Conditions générales de vente : socle unique de la négociation commerciale ; opposables si connues et acceptées.'],
  ['Clientèle', 'Ensemble des personnes attirées par l\'activité du commerçant ; élément essentiel du fonds, qui doit être réelle, certaine et propre.'],
  ['Consensualisme', 'Principe selon lequel l\'accord des volontés suffit à former le contrat, sans forme particulière (art. 1172).'],
  ['Dénomination sociale', 'Nom qui identifie juridiquement une société, sous lequel elle est immatriculée et agit.'],
  ['Devoir de confidentialité', 'Obligation de ne pas divulguer ni réutiliser une information confidentielle reçue pendant les négociations (art. 1112-2).'],
  ['Dommages et intérêts', 'Somme versée pour réparer le préjudice causé par l\'inexécution (art. 1231-1).'],
  ['Droit au bail', 'Droit du locataire d\'occuper le local dans le cadre d\'un bail commercial ; élément du fonds de commerce, qui a une valeur économique.'],
  ['Droit au renouvellement', 'Droit du locataire commerçant d\'obtenir le renouvellement de son bail à son expiration (L.145-8) ; pas un renouvellement automatique.'],
  ['Enseigne', 'Signe qui identifie l\'établissement et permet de repérer physiquement le lieu d\'exploitation.'],
  ['Exception d\'inexécution', 'Droit de suspendre sa propre obligation tant que l\'autre partie n\'exécute pas la sienne (art. 1219).'],
  ['Exécution forcée en nature', 'Possibilité pour le créancier d\'obtenir exactement ce qui était prévu, après mise en demeure (art. 1221).'],
  ['Force majeure', 'Événement extérieur, imprévisible et irrésistible qui exonère le débiteur de sa responsabilité (art. 1218).'],
  ['Force obligatoire', 'Le contrat légalement formé s\'impose aux parties comme une loi (art. 1103).'],
  ['Indemnité d\'éviction', 'Somme due en principe par le bailleur qui refuse le renouvellement du bail commercial (L.145-14).'],
  ['Liberté contractuelle', 'Liberté de contracter ou non, de choisir son cocontractant, le contenu et la forme du contrat, dans les limites de la loi (art. 1102).'],
  ['Marchandises', 'Biens corporels du fonds destinés à être vendus.'],
  ['Matériel / outillage', 'Biens corporels du fonds utilisés durablement pour exploiter l\'activité.'],
  ['Mise en demeure', 'Interpellation formelle du débiteur pour lui demander d\'exécuter son obligation ; écrit conseillé pour la preuve.'],
  ['Nom commercial', 'Nom sous lequel le commerçant exerce son activité et est connu de sa clientèle ; identifie l\'activité.'],
  ['Obligation d\'information', 'Devoir de révéler à l\'autre partie une information déterminante pour son consentement (art. 1112-1).'],
  ['Offre', 'Proposition ferme et précise, adressée à un destinataire, exprimant la volonté d\'être lié en cas d\'acceptation.'],
  ['Préavis', 'Délai d\'information laissé au partenaire avant la fin d\'une relation commerciale établie ; doit être écrit et suffisant.'],
  ['Réduction du prix', 'Diminution proportionnelle du prix en cas d\'exécution imparfaite acceptée (art. 1223).'],
  ['Relation commerciale établie', 'Relation stable, régulière et habituelle entre partenaires ; une commande isolée ne suffit pas.'],
  ['Résiliation triennale', 'Faculté du preneur de donner congé à l\'expiration de chaque période de 3 ans du bail commercial.'],
  ['Résolution', 'Anéantissement du contrat en cas d\'inexécution suffisamment grave (art. 1224 à 1227).'],
  ['Rupture brutale', 'Fin d\'une relation commerciale établie sans préavis écrit suffisant ; engage la responsabilité de son auteur (L.442-1, II).'],
  ['Universalité de fait', 'Ensemble de biens juridiquement distincts réunis par une personne dans un même but économique (ex. : le fonds de commerce).'],
  ['Affacturage', 'Cession de ses créances clients à un factor, qui en avance le montant et peut en assurer le recouvrement.'],
  ['Autofinancement', 'Financement interne par les bénéfices non distribués réinvestis dans l\'entreprise.'],
  ['Bénéfice de discussion', 'Droit de la caution simple d\'exiger que le créancier poursuive d\'abord les biens du débiteur principal.'],
  ['Bénéfice de division', 'Droit, en présence de plusieurs cautions, de demander que les poursuites soient divisées entre elles.'],
  ['Caution', 'Personne qui s\'engage envers le créancier à payer la dette du débiteur en cas de défaillance de celui-ci.'],
  ['Cautionnement', 'Sûreté personnelle accessoire : contrat par lequel une caution s\'oblige à payer la dette d\'autrui (art. 2288).'],
  ['Cautionnement solidaire', 'Cautionnement où la caution renonce aux bénéfices de discussion et de division : le créancier peut la poursuivre directement.'],
  ['Commissaire de justice', 'Officier public (ex-huissier de justice) chargé notamment de l\'exécution forcée (saisies).'],
  ['Créance certaine, liquide et exigible', 'Créance incontestable dans son principe, chiffrée, et dont l\'échéance est arrivée.'],
  ['Créancier chirographaire', 'Créancier sans sûreté particulière, payé sur le patrimoine du débiteur en concours avec les autres.'],
  ['Crédit-bail', 'Location d\'un bien acheté par une société de crédit-bail, avec option d\'achat en fin de contrat (L.313-7 C. mon. fin.).'],
  ['Droit de gage général', 'Droit de tout créancier sur l\'ensemble du patrimoine de son débiteur (art. 2284-2285).'],
  ['Droit de préférence', 'Droit d\'être payé prioritairement sur la valeur du bien grevé d\'une sûreté réelle, selon son rang.'],
  ['Droit de suite', 'Droit d\'exercer la sûreté sur le bien même s\'il a été transmis à un tiers.'],
  ['Échéance', 'Date à laquelle le paiement doit intervenir.'],
  ['Financement participatif', 'Collecte de fonds auprès de nombreux contributeurs via une plateforme : don, prêt ou investissement.'],
  ['Gage', 'Sûreté réelle portant sur un bien meuble corporel (art. 2333).'],
  ['Garantie autonome', 'Sûreté personnelle indépendante de l\'obligation garantie : le garant paie à première demande ou selon les modalités convenues (art. 2321).'],
  ['Hypothèque', 'Sûreté réelle portant sur un immeuble (art. 2393 et s.).'],
  ['Injonction de payer', 'Procédure judiciaire simple et rapide pour obtenir un titre ordonnant le paiement d\'une créance (art. 1405 et s. CPC).'],
  ['Lettre d\'intention', 'Engagement de faire ou de ne pas faire pour soutenir un débiteur (art. 2322).'],
  ['Nantissement', 'Sûreté réelle portant sur un bien meuble incorporel : créance, fonds de commerce, marque… (art. 2355).'],
  ['Opération de crédit', 'Mise à disposition de fonds à titre onéreux, ou engagement par signature (L.313-1 C. mon. fin.).'],
  ['Paiement', 'Exécution volontaire de la prestation due (art. 1342).'],
  ['Sûreté personnelle', 'Garantie reposant sur l\'engagement d\'une personne supplémentaire envers le créancier.'],
  ['Sûreté réelle', 'Garantie reposant sur un bien affecté au paiement préférentiel du créancier (art. 2323).'],
  ['Titre exécutoire', 'Acte (souvent une décision de justice) constatant une créance certaine, liquide et exigible, sans lequel aucune exécution forcée n\'est possible.'],
];
notions.sort((a, b) => a[0].localeCompare(b[0], 'fr'));
add(table([3000, 6638], ['Notion', 'Définition'], notions.map(([n, d]) => [`**${n}**`, d])));

// =====================================================================
// PAGE DE TITRE + SOMMAIRE
// =====================================================================
const front = [];
front.push(new Paragraph({ spacing: { before: 2400, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Droit des affaires', bold: true, color: RED, size: 64 })] }));
front.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'Licence Gestion et Management – L2 S3', size: 28 })] }));
front.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: 'Mme Wolf – iaelyon, Université Lyon 3', size: 24, color: GREY })] }));
front.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 800 }, children: [new TextRun({ text: 'Cours complété à partir des slides (chapitres 1 à 5)', italics: true, size: 24 })] }));
front.push(...box('remarque', 'Code couleur du document', [
  B('[[Terme en rouge souligné]] : définition à connaître.'),
  B('==Surligné jaune== : idée essentielle.'),
  B('Encadré bleu : article de loi.'),
  B('Encadré vert : fil rouge (Lucas) ou exercice du cours.'),
  B('Encadré gris : remarque ou complément du professeur.'),
  B('Encadré orangé : points à retenir en fin de chapitre.'),
]));
front.push(pageBreak());
front.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Sommaire')] }));
front.push(P('//Cliquez sur un titre pour y accéder directement.//', { run: { color: GREY } }));
for (const t of toc) {
  if (t.level > 3) continue;
  const indent = { 1: 0, 2: 400, 3: 800 }[t.level];
  const style = t.level === 1 ? { bold: true, size: 24 } : t.level === 2 ? { size: 22 } : { size: 20, color: '404040' };
  front.push(new Paragraph({
    indent: { left: indent }, spacing: { before: t.level === 1 ? 140 : 0, after: 10 },
    children: [new InternalHyperlink({ anchor: t.id, children: [new TextRun({ text: t.text, ...style, color: t.level === 1 ? RED : style.color })] })],
  }));
}
front.push(pageBreak());

// =====================================================================
const doc = new Document({
  creator: 'Droit des affaires – notes de cours',
  title: 'Droit des affaires – Cours complété',
  styles: {
    default: { document: { run: { font: 'Helvetica', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 44, bold: true, color: RED }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, color: '000000' }, paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, allCaps: true, color: '000000' }, paragraph: { indent: { left: 567 }, spacing: { before: 240, after: 120 }, outlineLevel: 2 } },
      { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, italics: true, color: BLUE }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 3 } },
    ],
  },
  numbering: { config: [
    { reference: 'puces', levels: [
      { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 283 } } } },
      { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1134, hanging: 283 } } } }] },
    { reference: 'nums', levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 340 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Droit des affaires – L2 S3 – Mme Wolf', size: 16, color: GREY })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GREY })] })] }) },
    children: [...front, ...body],
  }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(OUT, b); console.log('OK', OUT, b.length); });
