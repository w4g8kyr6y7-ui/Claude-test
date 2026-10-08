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
// CHAPITRES 3 à 5 : notes personnelles (slides à venir)
// =====================================================================
const pending = (n) => box('remarque', 'À compléter', [`Ce chapitre ne contient pour l\'instant que vos notes personnelles. Il sera complété dès que vous m\'aurez envoyé les slides du chapitre ${n}.`]);

add(H(1, 'Chapitre 3 – Les éléments indispensables à l\'activité commerciale'));
add(pending(3));
add(P('Fil rouge : Lucas ouvre son magasin.'));
add(H(2, '1. La notion de fonds de commerce'));
add(H(3, 'A. La définition'));
add(P('Le [[fonds de commerce]] est un ensemble de biens mobiliers, corporels et incorporels, organisé par un commerçant pour exploiter une activité commerciale et attirer une clientèle.'));
add(H(3, 'B. La nature juridique du fonds de commerce'));
add(P('Le fonds de commerce est qualifié juridiquement de bien meuble matériel.'));
add(box('remarque', null, ['À vérifier avec les slides : le fonds de commerce est classiquement qualifié de **bien meuble incorporel** (et non « matériel »), car c\'est un ensemble abstrait distinct des éléments qui le composent.']));
add(H(2, '2. Les éléments du fonds de commerce'));
add(H(3, 'A. La clientèle : élément essentiel du fonds'));
add(pageBreak());

add(H(1, 'Chapitre 4 – Les contrats dans la vie des affaires'));
add(pending(4));
add(H(3, 'B. La négociation et la formation du contrat'));
add(P('Responsabilité civile / pénale.'));
add(pageBreak());

add(H(1, 'Chapitre 5 – Se faire payer et financer son activité'));
add(pending(5));
add(H(2, 'Le paiement dans les relations d\'affaires'));
add(H(2, 'Le financement de l\'entreprise'));
add(H(2, 'La sécurisation du financement'));
add(pageBreak());

// =====================================================================
// GLOSSAIRE
// =====================================================================
add(H(1, 'Glossaire'));
add(H(2, 'Les articles de loi'));
add(P('Articles **cités dans les slides** (à connaître pour le QCM) :'));
const ch1 = () => link(toc.find(t => t.text.startsWith('Chapitre 1')).id, 'Ch. 1');
const ch2 = () => link(toc.find(t => t.text.startsWith('Chapitre 2')).id, 'Ch. 2');
const cellLinks = (...ls) => new Paragraph({ children: ls.flatMap((l, i) => i ? [new TextRun(' · '), l] : [l]) });
add(table([1900, 1700, 4938, 1100], ['Article', 'Code', 'Contenu', 'Chapitre'], [
  ['**L.110-1**', 'Code de commerce', 'Liste les **actes de commerce** (liste non limitative) : achat de biens pour les revendre (1°), opérations d\'intermédiaire, entreprises de manufacture, de transport, opérations de banque… et, entre toutes personnes, les **lettres de change** (10°).', cellLinks(ch2())],
  ['**L.110-3**', 'Code de commerce', '« À l\'égard des commerçants, les actes de commerce peuvent se prouver par tous moyens […] » → **liberté de la preuve**.', cellLinks(ch1(), ch2())],
  ['**L.121-1**', 'Code de commerce', '« Sont commerçants ceux qui exercent des actes de commerce et en font leur profession habituelle. » → **définition du commerçant**.', cellLinks(ch2())],
  ['**L.121-2**', 'Code de commerce', 'Le **mineur émancipé** peut être commerçant sur autorisation du juge au moment de son émancipation ou du président du tribunal judiciaire s\'il formule la demande après avoir été émancipé.', cellLinks(ch2())],
  ['**L.721-3**', 'Code de commerce', '**Compétence du tribunal de commerce** : litiges relatifs aux obligations nées à l\'occasion d\'actes de commerce entre commerçants, aux sociétés commerciales, aux actes de commerce entre toutes personnes.', cellLinks(ch2())],
  ['**R.123-220**', 'Code de commerce', 'Les déclarations relatives aux entreprises sont accomplies, sauf dispositions contraires, au moyen d\'un formulaire dématérialisé unique, sur le **guichet unique**.', cellLinks(ch2())],
]));
add(P('**Compléments** : articles **non cités dans les slides**, ajoutés pour éclairer vos notes de cours :'));
add(table([1900, 1700, 4938, 1100], ['Article', 'Code', 'Contenu', 'Chapitre'], [
  ['**Art. 55**', 'Constitution', 'Les traités régulièrement ratifiés ont une **autorité supérieure à celle des lois** (sous réserve de réciprocité).', cellLinks(ch1())],
  ['**Art. 1353**', 'Code civil', '**Charge de la preuve** : celui qui réclame l\'exécution d\'une obligation doit la prouver ; celui qui se prétend libéré doit justifier le paiement ou le fait qui a éteint son obligation.', cellLinks(ch1())],
  ['**Art. 1358**', 'Code civil', 'Hors les cas où la loi en dispose autrement, la preuve peut être apportée **par tout moyen**.', cellLinks(ch1())],
  ['**Art. 1359**', 'Code civil', 'L\'acte juridique portant sur une somme excédant un montant fixé par décret (**1 500 €**) doit être prouvé **par écrit**.', cellLinks(ch1(), ch2())],
  ['**Art. 1360**', 'Code civil', 'Exceptions à l\'écrit : **impossibilité matérielle ou morale** de se procurer un écrit, usage, perte de l\'écrit par force majeure.', cellLinks(ch1())],
  ['**Art. 413-2**', 'Code civil', 'Le mineur peut être **émancipé** à partir de **16 ans** révolus, par décision du juge des tutelles.', cellLinks(ch2())],
  ['**L.210-1**', 'Code de commerce', 'Sont **commerciales par leur forme**, quel que soit leur objet : SNC, sociétés en commandite simple, SARL et sociétés par actions (SA, SAS…).', cellLinks(ch2())],
  ['**L.526-22**', 'Code de commerce', 'L\'**entrepreneur individuel** a un **patrimoine professionnel** (biens, droits, obligations et sûretés utiles à son activité) distinct de son patrimoine personnel.', cellLinks(ch2())],
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
];
add(table([3000, 6638], ['Notion', 'Définition'], notions.map(([n, d]) => [`**${n}**`, d])));

// =====================================================================
// PAGE DE TITRE + SOMMAIRE
// =====================================================================
const front = [];
front.push(new Paragraph({ spacing: { before: 2400, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Droit des affaires', bold: true, color: RED, size: 64 })] }));
front.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'Licence Gestion et Management – L2 S3', size: 28 })] }));
front.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: 'Mme Wolf – iaelyon, Université Lyon 3', size: 24, color: GREY })] }));
front.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 800 }, children: [new TextRun({ text: 'Cours complété à partir des slides (chapitres 1 et 2)', italics: true, size: 24 })] }));
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
