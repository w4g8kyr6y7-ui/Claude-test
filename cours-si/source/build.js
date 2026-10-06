// Builds the course document. Content lives here; layout helpers live in lib.js.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Footer, PageNumber, Tab, TabStopType, BorderStyle,
} = require('docx');
const L = require('./lib');
const { C, MARGIN, PAGE_W, runs, body, toc, H1, H2, H3, SRC, P, UL, OL, DEF, KEY, NOTE, IMG, TBL, SWOT, RETENIR } = L;

// =====================================================================
// Page de titre + sommaire
// =====================================================================
const cover = [
  new Paragraph({ spacing: { after: 40 }, children: runs('LICENCE 2 ÉCONOMIE-GESTION · COURS DE SYNTHÈSE', { bold: true, size: 18, color: C.accent }) }),
  new Paragraph({ spacing: { after: 40 }, children: runs("Systèmes d'information", { bold: true, size: 56, color: C.primary }) }),
  new Paragraph({ spacing: { after: 60 }, children: runs('Fondamentaux des SI · Séances 1 à 9', { size: 26, color: C.muted }) }),
  new Paragraph({ spacing: { after: 320 }, children: runs('Document évolutif : les séances suivantes seront ajoutées à la suite.', { italics: true, size: 18, color: C.muted }) }),
  new Paragraph({
    spacing: { after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 4 } },
    children: runs('Sommaire', { bold: true, size: 30, color: C.primary }),
  }),
  new Paragraph({ spacing: { after: 120 }, children: runs('Clique sur un titre pour y accéder (Ctrl + clic sous Windows). Dans Word, le volet de navigation (Affichage › Volet de navigation) affiche aussi tous les titres.', { italics: true, size: 17, color: C.muted }) }),
  new Paragraph({ children: [new TextRun('@@TOC@@')] }),
];

// =====================================================================
// SÉANCE 1
// =====================================================================
H1("Séance 1 – Introduction aux systèmes d'information");
SRC('Source : notes du cours magistral.');

H2("1. Qu'est-ce qu'un système d'information ?");
H3('Définition');
DEF("Un **système d'information (SI)** est un **ensemble organisé de ressources** (humaines, matérielles, logicielles, données, procédures) permettant de **collecter, stocker, traiter et diffuser** l'information au sein de l'organisation.");
UL([
  "Ces ressources forment des **organes liés entre eux** par le partage d'informations. Le SI **facilite la circulation** de l'information et **automatise les traitements réguliers**.",
  "**SI ≠ informatique** : l'informatique ne désigne que les technologies. La **technologie est un moyen** ; **l'information et la décision sont la finalité** du SI.",
]);

H3('Donnée ≠ information');
TBL(['Donnée', 'Information'], [0.5, 0.5], [
  ['Fait **brut**, sans interprétation (un nombre, un mot, une date…).', 'Donnée **mise en contexte et interprétée** : elle prend du sens et devient **utile à la décision**.'],
], { firstColBold: false });

H3('Ce que le SI change');
UL([
  "**Avant le SI** : une gestion artisanale, sur papier, qui entraîne des **retards** dans la circulation des informations.",
  "**Avec le SI** : tout est **synchronisé**, **automatisé** quand c'est possible et **quasi immédiat**.",
]);
KEY("Le SI ne change pas seulement les outils : il **transforme la manière d'organiser le travail et de décider**.");

H3("Repères historiques : les origines de l'information");
TBL(['Période', 'Repère', 'Apport'], [0.2, 0.45, 0.35], [
  ['≈ –20 000 ans', 'Un os gravé : plus ancienne trace connue de mémorisation d\'une information', 'Mémoriser'],
  ['Mésopotamie (≈ 3 300 av. J.-C.)', 'Jetons d\'argile, puis écriture cunéiforme', 'Naissance de la **comptabilité** et de l\'**archivage**'],
  ['XVe siècle', 'Registres papier, comptabilité en **partie double** (Luca Pacioli, 1494)', 'Structurer l\'information de gestion'],
  ['1890', '**Cartes perforées** (recensement américain)', 'Premier **traitement automatisé de masse**'],
  ['1950-1980', 'Ordinateurs de gestion, puis micro-informatique et réseaux internes', 'Premiers SI en entreprise'],
  ['Depuis 2000', 'Internet, cloud, intelligence artificielle', 'Information disponible partout, en **temps réel**, analysée à grande échelle'],
]);

H2('2. Composantes et fonctions du SI');
H3('Les 5 composantes');
TBL(['Composante', 'Contenu'], [0.3, 0.7], [
  ['Ressources humaines', 'Utilisateurs, informaticiens, décideurs'],
  ['Matériels et logiciels', 'Ordinateurs, serveurs, applications'],
  ['Données', 'Informations brutes stockées et structurées'],
  ['Procédures', 'Règles de gestion et modes opératoires'],
  ['Réseaux', 'Infrastructure de communication'],
]);
H3('Les 4 fonctions');
TBL(['1. Collecter', '2. Traiter', '3. Stocker', '4. Diffuser'], [0.25, 0.25, 0.25, 0.25], [
  ['Saisir les données internes et externes', 'Transformer les données en informations', "Conserver l'information pour un usage ultérieur", "Communiquer l'information aux bons acteurs"],
], { firstColBold: false });

H3('Les données : une ressource précieuse et fragile');
P("Un SI n'est **fiable que si ses données le sont**. Trois pièges classiques :");
UL([
  '**Données erronées** : coordonnées clients mal saisies, prix différent entre le catalogue et la facturation.',
  '**Analyses biaisées** : comparer des ventes de maillots de bain sans tenir compte de la saison.',
  '**Chiffres sans référentiel** : « +2 000 » ne veut rien dire si l\'on ignore si l\'on part de 100 ou de 100 000.',
]);
KEY("D'où la nécessité d'une **stratégie de gestion des données** : règles de saisie, droits d'accès, responsables identifiés, contrôles qualité réguliers.");

H2("3. Le SI dans l'organisation");
H3('Les 3 niveaux du SI');
TBL(['Niveau', 'Rôle', 'Utilisateurs', 'Exemple'], [0.18, 0.32, 0.2, 0.3], [
  ['Stratégique', 'Aide à la décision de **long terme**', 'Direction générale', 'Décider d\'ouvrir un nouveau marché'],
  ['Pilotage (tactique)', 'Suivi de la performance, **reporting**', 'Cadres, managers', 'Suivre ses ventes hebdomadaires'],
  ['Opérationnel', 'Gestion des **transactions quotidiennes**', 'Agents, exécutants', 'Enregistrer une vente en caisse'],
]);
KEY("Plus le niveau est élevé, plus l'information est **synthétique**, **externe** et **tournée vers l'avenir**.");
IMG('pyramide.png', 470, "Types de SI par niveau : STT (opérations), SIG et SAD (gestion), SID (stratégie), croisés avec les domaines fonctionnels.");

H3("Les SI selon les fonctions de l'entreprise");
UL([
  '**SIRH** : gestion des ressources humaines (séance 5).',
  '**SI comptable et financier** : facturation, comptabilité.',
  '**SI commercial (CRM)** : gestion de la relation client (séance 4).',
  '**SI logistique (SCM)** : gestion de la chaîne d\'approvisionnement (séance 6).',
]);

H3("Les objectifs d'un SI");
UL([
  "Caractériser, catégoriser et **capitaliser les connaissances** de l'organisation.",
  "Favoriser la pérennisation, la valorisation et l'actualisation de l'information.",
  '**Augmenter la productivité** et la qualité, **diminuer les coûts et les délais**.',
  'Éviter les erreurs, ou du moins leur répétition.',
  "Restituer **l'info utile**, sous une forme exploitable, **au bon moment, aux bonnes personnes**.",
]);
KEY("« Le SI, c'est la **mémoire évolutive de l'intelligence collective** de l'organisation » : il facilite le fonctionnement quotidien et la prise de décision, à tous les niveaux.");

H2('4. Pourquoi le SI est-il un enjeu majeur ?');
H3('Un enjeu stratégique');
P("Le SI n'est plus un simple outil de support : c'est une **ressource stratégique** qui conditionne la **compétitivité**.");
UL([
  "**Avantage concurrentiel** : se différencier par l'innovation, la rapidité ou la personnalisation de l'offre.",
  "**Alignement stratégique** : le SI doit soutenir et accompagner la stratégie globale de l'entreprise.",
  '**Aide à la décision** : des données fiables et disponibles pour éclairer les choix de la direction.',
]);
P('Exemples : **Uber**, première société de transport, ne possède aucun taxi ; **Airbnb**, premier hébergeur, ne possède aucun bien immobilier ; **Amazon**, premier distributeur, détient peu de stock en propre (de même Facebook, Netflix, Apple…). Leur actif principal **n\'est pas matériel : c\'est l\'information**.');

H3('Un enjeu organisationnel');
UL([
  "**Coordination** : le SI facilite la circulation de l'information entre services et niveaux hiérarchiques.",
  '**Décloisonnement** : il casse les silos en partageant des données communes.',
  '**Qualité de la décision**.',
]);

H3("Les défis de la conception d'un SI");
UL([
  '**Analyse des besoins** : traduire les besoins métier en exigences claires (**cahier des charges**).',
  '**Build vs Buy** : développer une solution sur mesure ou choisir un progiciel / ERP existant ?',
  '**Arbitrages projet** : concilier budget, délais et qualité.',
  '**Interopérabilité** : faire en sorte que les différents systèmes puissent échanger et exploiter des données entre eux.',
]);

RETENIR([
  "SI = ressources organisées (humaines, matérielles, logicielles, données, procédures) pour **collecter, traiter, stocker, diffuser** l'information. **SI ≠ informatique**.",
  'Une **donnée** est brute ; une **information** est une donnée interprétée, utile à la décision.',
  '**5 composantes** (RH, matériels/logiciels, données, procédures, réseaux) et **4 fonctions** (collecter, traiter, stocker, diffuser).',
  '**3 niveaux** : opérationnel, pilotage, stratégique ; plus on monte, plus l\'information est synthétique, externe et prospective.',
  'Le SI est un enjeu **stratégique** (avantage concurrentiel, alignement, décision) et **organisationnel** (coordination, décloisonnement).',
  'Un SI ne vaut que par la **qualité de ses données**.',
]);

// =====================================================================
// SÉANCE 2
// =====================================================================
H1("Séance 2 – L'entreprise étendue et son écosystème");
SRC('Source : notes du cours magistral.');
P("L'entreprise est en relation avec un ensemble de **parties prenantes**, internes et externes. Chacune a un **rôle** et s'appuie sur des **outils de SI** adaptés.");

H2('1. Les parties prenantes internes');
TBL(['Acteur', 'Rôle', 'SI et outils utilisés'], [0.17, 0.46, 0.37], [
  ['Salariés (employés)', 'Apportent leur travail (contrat de travail) contre une rémunération ; fabriquent les biens et services et participent à la **création de valeur ajoutée**, souvent sous la responsabilité d\'un manager.', ['Outils du quotidien et de gestion des données de base', 'Bureautique (Word, Excel, PowerPoint) : **données semi-structurées**', '**Systèmes de traitement des transactions (TPS)**']],
  ['Managers', 'Appliquent la stratégie décidée par les dirigeants ; **supervisent, analysent et optimisent** la performance de leurs équipes (ex. : augmenter le CA).', ['Outils de **pilotage métier**', 'Gestion de projet, gestion RH', 'Communication et collaboration']],
  ['Dirigeants et senior managers', 'Assurent la **gouvernance** : définissent les règles, la politique de fonctionnement interne et la **stratégie**.', ['**SI décisionnel**, appuyé sur la **BI**', '**Système d\'aide à la décision (DSS)**']],
  ['Actionnaires', 'Apportent des **capitaux** ; peuvent prendre part aux décisions et percevoir une part des bénéfices.', ['SI orienté **finance et analyse de la performance**', '**Reporting financier**']],
]);
DEF("**SI décisionnel** : ensemble d'outils, de processus et de ressources qui permet de **collecter, exploiter, restituer et partager les données** à des fins de **pilotage**, de **planification stratégique** et d'**aide à la décision**. Il s'appuie sur la **BI** (*Business Intelligence*).");
NOTE('Lien avec la séance 1 : TPS (Transaction Processing System) = STT en français ; DSS (Decision Support System) = SAD.');

H2('2. Les parties prenantes externes');
TBL(['Acteur', 'Rôle', 'SI associé'], [0.17, 0.53, 0.3], [
  ['Clients', 'Particuliers, entreprises (pour leur propre fonctionnement ou pour revendre, avec ou sans transformation) ou administrations qui **achètent** les produits ou services.', 'Relation client (CRM, séance 4)'],
  ['Sous-traitants et fournisseurs', '**Sous-traitant** : exécute un travail confié par une autre entreprise. **Fournisseur** : vend des produits à d\'autres entreprises. Tous deux contribuent à la performance et à la rentabilité.', 'Achats, EDI (séances 4 et 6)'],
  ['Distributeurs', '**Intermédiaires** qui permettent d\'atteindre les clients et de vendre les produits (ex. : concessionnaire automobile).', ['**GCL** : gestion de la chaîne logistique', '**WMS** : gestion d\'entrepôt', '**TMS** : gestion des transports']],
  ['Banques', 'Apportent des capitaux supplémentaires (**prêts** contre intérêts) ; tiennent les **comptes** qui reçoivent les paiements clients et servent à payer les fournisseurs.', 'Gestion des comptes bancaires'],
  ['État', 'Fournit des services non marchands, prélève **impôts et cotisations**, verse des **subventions**, fixe les règles du jeu (lois, règlements, droit du travail).', 'Services publics en ligne'],
]);

H2("3. Se positionner dans son écosystème : l'analyse SWOT");
P("La matrice **SWOT** croise l'**origine** des facteurs (interne / externe) et leur **effet** (positif / négatif).");
SWOT([
  ['Forces (Strengths)', 'Quels sont nos points forts et nos avantages concurrentiels ?'],
  ['Faiblesses (Weaknesses)', "Quels sont les points faibles de l'organisation ?"],
  ['Opportunités (Opportunities)', 'Quelles opportunités (tendances, usages, lois, technologies) pouvons-nous saisir ?'],
  ['Menaces (Threats)', "Quels dangers peuvent affecter la performance de l'entreprise ?"],
]);

H2("4. Modéliser les flux d'informations : introduction au BPMN");
DEF("Le **BPMN** est une **notation graphique standardisée** pour la **modélisation des processus métier**.");
P('Il s\'appuie sur trois familles d\'éléments : les **objets de flux** (événements, activités, passerelles), les **objets de connexion** (flux de séquence, flux de message, association) et les **couloirs** (*swimlanes* : piscines et lignes d\'eau). La notation est détaillée en **séance 3**.');

RETENIR([
  "Parties prenantes **internes** : salariés, managers, dirigeants, actionnaires. **Externes** : clients, fournisseurs et sous-traitants, distributeurs, banques, État.",
  'À chaque acteur ses outils : **TPS** et bureautique (salariés), **pilotage** (managers), **SI décisionnel / BI / DSS** (dirigeants), **reporting financier** (actionnaires).',
  "Le **SI décisionnel** collecte, exploite, restitue et partage les données pour piloter et décider.",
  '**SWOT** : forces et faiblesses (**interne**), opportunités et menaces (**externe**).',
  'Le **BPMN** sert à représenter les processus et les flux d\'informations.',
]);

// =====================================================================
// SÉANCE 3
// =====================================================================
H1('Séance 3 – Processus et ERP en entreprise');
SRC('Support : « Process et ERP en entreprise », G. Talens.');

H2('1. Les ERP (PGI)');
H3('Définitions');
DEF([
  "Un **ERP** (*Enterprise Resource Planning*), ou **PGI** (**progiciel de gestion intégré**), soutient les processus de **coordination et d'intégration de l'ensemble de l'entreprise**.",
  "Il fournit un **SI unifié** : des **modules logiciels interdépendants** (finance et comptabilité, RH, fabrication et production, ventes et marketing…) reposant sur une **base de données unifiée**.",
]);
DEF("Un **progiciel** est une application utilisable par **de nombreuses organisations** pour exercer tout ou partie de leurs fonctions. Sa mise en œuvre nécessite un **paramétrage**.");
P("Pourquoi intégrer ? Parce que **de nombreux processus sont inter-fonctionnels** : ils traversent plusieurs services (ventes, comptabilité, fabrication…).");

H3("Le principe d'intégration");
UL([
  "Une donnée est **saisie une seule fois**, au moment de l'événement qui la génère.",
  'Elle est **disponible en temps réel** pour tous les utilisateurs autorisés de la **base unique**, commune à tous les modules.',
  "Les modules couvrent **l'ensemble des activités** de l'entreprise.",
  'Un ERP gère plusieurs **entités** (organisations), **devises**, **langues** et **législations** (cas des multinationales).',
]);
IMG('erp.png', 450, "L'ERP : des modules interdépendants autour d'une base de données unique.");

H3("Les modules d'un ERP");
TBL(['Module', 'Contenu'], [0.24, 0.76], [
  ['Gestion commerciale', 'Clients (organisme qui commande, site de livraison, entité facturée, organisme qui paye), **prévision des ventes**, **commandes clients**, facturation'],
  ['Achats', 'Relations fournisseurs ; produits proposés par chaque fournisseur avec **prix d\'achat** et **délai de livraison** ; commandes fournisseurs'],
  ['Logistique', 'Suivi des **mouvements de matière** : entrées (fournisseurs, ateliers) et sorties (vers les ateliers ou les clients) ; entrepôts, distribution, transports'],
  ['Production', 'Gestion de production, suivi de la qualité, maintenance des équipements'],
  ['Gestion financière', 'Comptabilité générale, clients et fournisseurs ; trésorerie, immobilisations, consolidation'],
  ['Ressources humaines', 'Administration du personnel, temps de travail, congés et absences, **paie**, carrières et formation, compétences, recrutement, déplacements'],
]);

H2('2. Les processus');
H3('Définitions');
DEF("Un **processus** est un **ensemble d'activités corrélées ou interactives** qui délivre un **produit ou un service** à un **client interne ou externe** en **créant de la valeur ajoutée**.");
UL([
  'Les activités sont réalisées par **un ou plusieurs acteurs**, souvent issus de **services différents**, et suivent des **règles**.',
  'Une **activité** porte sur des objets physiques ou des informations, avec des **entrées** et des **sorties**. Elle se décompose en **tâches élémentaires**, réalisées par une personne ou un groupe.',
]);
KEY("**But d'un ERP : automatiser et supporter les processus de l'organisation.**");

H3("Exemple : la gestion d'une commande client");
OL([
  'Le client passe une commande.',
  "La commande est enregistrée dans l'ERP.",
  'Les marchandises sont sorties du stock et emballées.',
  'Le colis est expédié.',
  'Les marchandises sont facturées.',
  'Le client règle la facture.',
]);
P('Acteurs : le **client** (acteur externe), le **service commercial**, le **service logistique** et la **comptabilité clients**, qui **coopèrent en se transmettant l\'information**.');

H3('Le workflow');
DEF("Le **workflow** gère électroniquement l'ensemble des **tâches à accomplir par les acteurs** pour aboutir à un résultat. Il permet de **suivre les activités tout au long d'un processus**.");
TBL(['Exemple', 'États successifs du document', 'Acteurs'], [0.2, 0.45, 0.35], [
  ['Demande de congé', 'Brouillon → confirmée → validée → validée', 'Salarié → manager → responsable de secteur'],
  ['Facture fournisseur', 'Arrivée → approbation → validation financière → paiement et archivage', 'Émetteur de la commande → contrôleur de gestion → comptabilité'],
]);

H3('Acteurs et profils');
UL([
  'Chaque personne qui intervient est un **acteur** ; chaque acteur a un **profil**.',
  "Un profil définit un **ensemble d'autorisations** d'accès aux fonctions et aux données : **consultation, création, modification, suppression**.",
]);

H2('3. Bilan : avantages et inconvénients des ERP');
TBL(['Avantages', 'Inconvénients'], [0.5, 0.5], [[
  ['**Cohérence et homogénéité** des informations (un seul fichier articles, un seul fichier clients…) : même logique, même ergonomie', '**Partage du même SI** : communication interne et externe facilitée'],
  ['**Mise en œuvre complexe** si le périmètre est mal déterminé ou le projet mal piloté', '**Coût élevé** (sauf ERP open source : restent la formation et le service éventuel du fournisseur)', '**Difficultés d\'appropriation** par le personnel : importance de la **formation**', 'Nécessité d\'une **maintenance**'],
]], { firstColBold: false, headerFill: C.accent });

H2('4. Modéliser les processus : BPM et BPMN');
H3('Le BPM (Business Process Management)');
UL([
  'Le BPM vise à **optimiser les processus** pour **améliorer la performance** de l\'entreprise : les rendre plus **efficaces** et capables de **s\'adapter aux changements**.',
  "Une **procédure d'entreprise** est un ensemble de tâches et d'activités coordonnées et dirigées par des **personnes** et des **équipements**, en vue d'un but.",
]);
H3('La notation BPMN');
DEF("Le **BPMN** (*Business Process Modeling Notation*) est une **notation graphique standardisée** qui modélise les procédures d'entreprise dans un schéma compréhensible **à la fois par les techniciens et par les utilisateurs**.");
P('Repères : BPMN 1.0 publié par l\'**OMG** (*Object Management Group*) en 2006 ; BPMN 2.0 en 2011 ; norme internationale **ISO/CEI 19510** en 2013 (version 2.0.2).');

H3('Les éléments de base');
UL([
  "**Activités et tâches** (rectangles arrondis) : une activité peut se décomposer en tâches ; la **tâche** est l'opération élémentaire non décomposable, réalisée par un humain ou une machine.",
  "**Événements** (cercles) : de **départ**, **intermédiaire** ou de **fin**. Un départ peut être déclenché par un **message** (demande d'un utilisateur extérieur) ou être **temporel** (ex. : « dernier jour ouvrable du mois » → établir la paie).",
  '**Flux de séquence** (flèche pleine) : il a une origine et une destination et **ordonne les tâches** d\'un processus.',
  ['**Passerelles** (losanges) : elles créent des **alternatives** ou font **converger** plusieurs branches.', [
    '**Exclusive** (losange vide ou avec un X) : **une seule branche** est suivie, selon une condition.',
    '**Parallèle** (losange avec un +) : plusieurs activités **en parallèle** ; toutes doivent être terminées avant de continuer.',
  ]],
  "**Sous-processus** (rectangle avec un +) : activité qui contient d'autres activités ; il décrit une partie plus finement sans surcharger le processus principal.",
]);
IMG('bpmn.png', 540, 'Les principaux symboles BPMN.');

H3('La collaboration : piscines, couloirs, connecteurs et objets');
UL([
  '**Piscine** (*pool*) : représente un **participant** au processus. Décrire le processus à l\'intérieur d\'une piscine, c\'est faire de l\'**orchestration**.',
  '**Ligne d\'eau ou couloir** (*swimlane*) : subdivise une piscine pour organiser les tâches (par service, par rôle).',
  ['**Trois connecteurs** :', [
    "**flux de séquence** : enchaînement des événements et activités ; il **ne peut pas sortir d'une piscine**, mais peut passer d'un couloir à l'autre ;",
    '**flux de message** : messages qui circulent **entre deux participants** (deux piscines) ;',
    '**association** : relie un texte, un fichier ou un objet de données à une tâche (entrées et sorties).',
  ]],
  'Flux de message vers un **objet** de l\'autre piscine : **chorégraphie** entre deux processus. Vers une **piscine** fermée : **collaboration** entre le processus et le partenaire.',
  "**Objets** : l'**objet de données** indique la donnée nécessaire ou produite par une tâche (il peut être modifié) ; la **collection d'objets** représente un ensemble (ex. : liste de fournisseurs) ; la **source de données** permet de lire ou stocker des données (ex. : l'ERP).",
]);
IMG('bpmn_conges.png', 620, 'Exemple du cours : demande de congés sur deux couloirs (Employé / Manager) avec passerelles exclusives.');

H3("Exercice d'application : gestion d'une bibliothèque");
UL([
  "Un abonné emprunte **5 livres maximum**, pour **3 semaines** maximum.",
  "En cas de retard, il est **suspendu** autant de jours que de jours de retard, **cumulés par livre** (2 livres avec 1 semaine de retard chacun = 2 semaines de suspension à partir du retour).",
  "Les abonnements se terminent à la fin de l'année civile : renouvellement obligatoire **en début d'année**.",
  "La vérification « l'abonné peut-il emprunter ? » doit être modélisée dans un **sous-processus**.",
  "Suite : 3 services (**Accueil** : emprunts et retours ; **Documentaliste** : remise en rayon ; **Service adhérents** : adhésion). Un adhérent non trouvé peut s'inscrire (détails inconnus). → Réaliser un **diagramme de collaboration**.",
]);

RETENIR([
  '**ERP / PGI** : progiciel intégré, modules interdépendants + **base de données unique** ; donnée **saisie une seule fois**, disponible **en temps réel**.',
  '**Processus** = activités corrélées qui créent de la valeur pour un client interne ou externe ; processus → activités → tâches. L\'ERP **automatise et supporte** les processus.',
  '**Workflow** = gestion électronique de l\'enchaînement des tâches entre acteurs ; **profil** = droits (consulter, créer, modifier, supprimer).',
  'ERP : **+** cohérence et partage de l\'information ; **–** coût, complexité, appropriation, maintenance.',
  'BPMN : événements (cercles), tâches (rectangles), passerelles (losanges : **exclusive X** / **parallèle +**), flux de **séquence** (plein, dans une piscine) vs flux de **message** (pointillés, entre piscines).',
  '**Piscine** = participant (orchestration) ; **couloir** = rôle ou service ; messages entre piscines = **collaboration** / **chorégraphie**.',
]);

// =====================================================================
// SÉANCE 4
// =====================================================================
H1('Séance 4 – SI des ventes et du marketing');
SRC('Support : « SI – Ventes et Marketing », G. Talens.');

H2('1. Évolution du marketing');
H3('Du marketing transactionnel au marketing relationnel');
P("Depuis les années 1990, les entreprises passent d'un marketing **« transactionnel »** (centré produit) à un marketing **« relationnel »** (orienté client). But : accompagner le consommateur au quotidien, le conseiller, susciter sa **confiance** et son **attachement**, et **anticiper ses désirs**.");
TBL(['Critère', 'Marketing transactionnel', 'Marketing relationnel'], [0.28, 0.32, 0.4], [
  ['Principaux arguments', 'Le produit', 'Le produit **et la relation**'],
  ['Communication', 'De masse', '**Individualisée**'],
  ['Évaluation de la valeur', 'Achat présent', 'Achats présents **et futurs**'],
  ['Temporalité', "Le moment de l'achat", '**La durée** de la relation'],
  ["Critères d'efficacité", 'CA', 'CA, **fidélisation**, **satisfaction**'],
]);

H3('Fonctions du marketing et marketing digital');
UL([
  "**Marketing traditionnel** : identifier les besoins et attentes du consommateur pour créer et vendre des produits ou services. Le comportement du consommateur a évolué → passage du marketing **orienté produit** au marketing **orienté client**.",
  '**Fonctions du marketing** : planification et promotion des produits ; recherche de nouveaux marchés ; innovation (produits et marketing) ; vente en ligne ; gestion de la relation client.',
]);
DEF("**Marketing digital** : ensemble des techniques marketing utilisées sur les **supports et canaux digitaux** pour vendre un produit ou promouvoir une marque. Enjeu : **vendre et augmenter le trafic**.");
TBL(['Marketing classique', 'Marketing digital'], [0.5, 0.5], [
  ['Bons de réduction par courrier (imprimé sans adresse) ou dans la presse papier', 'E-coupons sur les sites, blogs, plateformes'],
  ['Offres promotionnelles personnalisées par courrier', 'Mails personnalisés, e-coupons sur mobile'],
  ['Commande par courrier ou téléphone', "Commande en ligne depuis n'importe quel support (ordinateur, mobile, tablette)"],
  ['Informations en magasin auprès d\'un vendeur', 'Informations en ligne, *click to call* (mise en relation avec un conseiller)'],
  ['Jeu concours papier (courrier ou urne en magasin)', 'Jeu concours en ligne'],
  ['Avis déposés dans une urne en magasin', 'Avis sur le site, le blog…'],
], { firstColBold: false });

H3("L'entreprise digitale");
UL([
  "Le décalage dans le temps et dans l'espace devient la norme : **24 h/24, 7 j/7**, logique **mondialisée** au-delà des frontières.",
  "C'est **impossible sans SI** : Amazon, Alibaba, Booking… n'existeraient pas ; le tertiaire en dépend ; la vente au détail et la production en ont besoin pour survivre et prospérer.",
]);

H2('2. Le SI marketing dans l\'organisation');
H3('Les niveaux du SI marketing');
TBL(['Niveau', 'Rôle', 'Exemples'], [0.15, 0.5, 0.35], [
  ['Opérationnel', 'Faire fonctionner les **activités élémentaires récurrentes**', 'Service à la clientèle, gestion des ventes (commandes), suivi des promotions, changements de prix'],
  ['Gestion', 'Assister les cadres (« où en sommes-nous de nos prévisions ? ») : **rapports** à court terme ou sur des périodes passées, à partir des données opérationnelles (**BI**). Aide aux décisions moins structurées par **simulation**, avec des données externes et une grande puissance d\'analyse.', 'Tableau de bord des ventes par secteur, par commercial, par mois ; prix de la concurrence ; suggestion d\'autres produits lors d\'une commande'],
  ['Stratégique', 'Aider les dirigeants à **fixer les objectifs**, à partir de données internes et d\'**événements externes** (nouvelles lois fiscales, arrivée de concurrents…)', 'Bases de données externes : **Insee**, **Kompass**, **OCDE**…'],
]);

H3('Relations entre les systèmes');
UL([
  "L'**intégration des SI** désigne la façon dont les différents SI **partagent, transfèrent et stockent** les données de l'organisation.",
  'Le SI marketing échange avec la **fabrication et logistique**, la **finance et comptabilité** et les **ressources humaines**.',
  'Schéma type : les **STT** (traitement des commandes, gestion de production, gestion comptable) alimentent les **fichiers du SIG** (données des ventes, industrielles, financières), exploités par le **SAD** pour produire **rapports et indicateurs** destinés aux **dirigeants**.',
]);

H3('Les objectifs du SI marketing (SIM)');
P('Direction et gestion des ventes ; automatisation de la force de vente ; gestion des produits ; gestion de la publicité et de la promotion ; prévisions des ventes ; études de marché ; budget marketing ; e-commerce ; e-CRM.');
KEY('Trois grands outils étudiés : **e-commerce**, **EDI** et **CRM**.');

H2('3. Le e-commerce');
H3('Chiffres clés (FEVAD, 2025)');
TBL(['Indicateur', 'Valeur'], [0.32, 0.68], [
  ['Chiffre d\'affaires en France', '**196,4 Md€ en 2025** (+7 %) ; 179 Md€ en 2024 (+9,6 %)'],
  ['Part du commerce de détail', '≈ **12 %**'],
  ['Dynamique', 'Produits +4 % (stables) ; **services +9 %** (transport, tourisme, loisirs)'],
  ['Cyberacheteurs', '**42,2 millions**, soit 80 % des Français de 16 à 74 ans'],
  ['Sites marchands actifs', 'Plus de **158 000** (+7 %)'],
  ['Emplois', '**234 000** (+9 %)'],
  ['Intelligence artificielle', '**94 %** des e-commerçants utilisent l\'IA générative ; près d\'**1 cyberacheteur sur 3** utilise l\'IA dans son parcours d\'achat'],
  ['Écrans utilisés', 'Ordinateur 76 %, mobile 69 %, tablette 19 %'],
  ['Consommation responsable', '79 % jugent important le *Made in France* ; 72 % choisissent des produits respectant des critères environnementaux et éthiques ; 41 % ont acheté de la seconde main en 12 mois'],
]);
DEF("**Commerce agentique** : modèle où des **agents d'IA autonomes** agissent au nom des consommateurs ou des entreprises pour **rechercher, comparer, négocier et finaliser** des transactions. Près de 7 e-commerçants sur 10 y voient l'une des innovations les plus prometteuses.");
P('Cette croissance a fait naître de **nouveaux modèles économiques** qui bouleversent de nombreux secteurs.');

H3('E-commerce B to C et réseaux sociaux');
DEF([
  "**E-commerce** : transactions commerciales numériques entre les entreprises et les particuliers.",
  '**Commerce électronique de détail (B to C)** : vente directe par Internet de produits et services aux consommateurs.',
]);
UL([
  'Les consommateurs accèdent à une multitude de sites aux prix concurrentiels.',
  'Les **réseaux sociaux** permettent aux entreprises de créer des **offres ciblées** et d\'interagir avec des clients potentiels.',
  'Nouveau métier, le **community manager** : développer la notoriété de la marque sur le web, animer la communauté, accompagner l\'évolution de la plateforme, faire du reporting et de l\'analyse, assurer une veille.',
]);

H3('Parcours client et personnalisation');
UL([
  'Le site enregistre les **traces de navigation** : pages consultées, temps passé, articles achetés. On analyse ainsi les intérêts et le comportement pour construire des **profils**.',
  "Pratique **condamnable sans l'accord du consommateur** (**RGPD**, 2018).",
  "Exemple du cours : un temps long sur la page d'accueil peut signaler un site peu clair ; le chemin Livres → Polar & Thriller → Bonnes affaires révèle les catégories demandées et les préférences du client ; un panier abandonné peut traduire un changement d'avis, un manque de temps ou un problème de paiement.",
  '**Personnalisation** : communications, offres et pages web adaptées à chaque client ; comparaison avec d\'autres clients pour **anticiper** ses besoins. Elle suppose des **données pertinentes** (inscription en ligne).',
]);

H3('Un site efficace : attractivité, sécurité, référencement');
TBL(['Critère', 'Points clés'], [0.25, 0.75], [
  ['Ergonomie', 'Grande clarté, offres limitées'],
  ['Navigation', 'Règle des **trois clics**'],
  ['Expérience utilisateur', 'Visuellement confortable, **adaptatif**'],
  ['Sécurité', 'Protocole sécurisé **https**'],
  ['E-réputation', 'Les avis viennent souvent des mécontents → faciliter la collecte des commentaires et des avis'],
  ['Présentation', 'Une page « Qui sommes-nous ? »'],
]);
TBL(['Référencement', 'Coût', 'Principe'], [0.3, 0.15, 0.55], [
  ['Local', 'Gratuit', 'Critères géographiques, administration de la fiche Google, nombre d\'avis clients'],
  ['Publicitaire (**SEA**)', 'Payant', 'Plateforme Google Ads ou autre ; classement selon le **coût du clic** et la **qualité de l\'annonce**'],
  ['Naturel (**SEO**, *Search Engine Optimisation*)', 'Non payant', 'Structure du site, **meilleurs mots-clés** aux meilleurs endroits ; classement selon le nombre de **liens entrants**'],
]);
NOTE('SEA est développé « Search Engine Acquisition » dans le cours ; on rencontre aussi « Search Engine Advertising ».');
P('**Choisir les bons mots-clés** pour ressortir en 1ère page : pertinents pour l\'activité ; se demander « que tapent les gens ? » et « est-ce utilisé par d\'autres ? » ; viser une expression **très recherchée et peu utilisée par la concurrence** (outil : Google Trends).');

H3('Le m-commerce');
P('Le commerce sur **mobile** offre des services rapides et des tâches accomplies plus efficacement : billets et cartes d\'embarquement, services liés à la **géolocalisation**, services bancaires et financiers.');

H2('4. Le commerce interentreprises (B to B) et l\'EDI');
DEF("**B to B** : vente par système électronique (Internet, EDI…) de produits et services **entre entreprises**. **66 %** repose sur l'**EDI**.");
DEF("**EDI (Échange de Données Informatisé)** : transmission d'informations **d'un SI à un autre** par l'intermédiaire d'un **réseau à valeur ajoutée (RVA)**, selon des **normes** qui définissent la structure des documents par domaine (**EDIFACT**, déclinée par pays : EDIFRANCE…).");
UL([
  'Documents échangés : **commandes, bons de livraison, factures, paiements** → les **stocks sont mis à jour sans saisie** de données.',
  '**WebEDI** : utilise **Internet** comme infrastructure de transport, avec la même normalisation des données → **élargit le nombre de partenaires** commerciaux.',
  '**Extranet** : intranet privé accessible uniquement à des **partenaires tiers authentifiés**.',
]);

H2('5. La gestion de la relation client (CRM)');
H3('Définition et objectifs');
DEF("Le **CRM** (*Customer Relationship Management*) utilise les SI pour **définir et analyser tous les types d'interactions** de l'entreprise avec ses clients, afin d'**identifier des prospects** pour en faire des clients et de **fidéliser** les clients. Il assure le service client **de la réception de la commande jusqu'à la livraison**.");
UL([
  'Fournir l\'information et les outils pour **améliorer le service**.',
  'Offrir un **point de contact unifié** avec la clientèle, quel que soit le canal : téléphone, e-mail, comptoir de service, courrier, site web, magasin…',
]);

H3('Les fonctions du CRM');
TBL(['Domaine', 'Fonctions'], [0.25, 0.75], [
  ['Ventes', ['**Automatisation de la force de vente** : concentrer les efforts sur les **clients les plus rentables**', 'Partager les informations (prospects, contacts, produits, achats) entre ventes, marketing et logistique', '**Prévisions des ventes** par territoire, par équipe…']],
  ['Service', ['Satisfaction client, gestion des retours, assistance', 'Améliorer l\'efficacité des **centres d\'appels**']],
  ['Marketing', ['Informations sur les clients, produits et services → **marketing ciblé**', 'Publipostages et e-mails, et leur suivi', 'Offres de **produits complémentaires**, offres groupées', 'Mesure du **taux de réussite** de chaque campagne']],
]);

H3('Personnaliser la relation client');
UL([
  '**Score RFM** : **R**écence (date du dernier achat ou contact), **F**réquence (nombre d\'achats sur une période), **M**ontant (cumulé).',
  '**Communication personnalisée** (e-mails, offres) et **conservation des échanges** (protocoles de communication).',
  '**Analyse des campagnes d\'e-mailing** : taux d\'ouverture, taux de clics → envoyer un message adapté.',
  "**CRM connecté** : intégrer les réseaux sociaux (réponses aux réclamations, plaintes, questions) et écouter les conversations. Ceux qui parlent de l'entreprise sont-ils dans son SI ? Ses clients suivent-ils les réseaux sociaux ?",
]);

H3('CRM opérationnel et CRM analytique');
TBL(['CRM opérationnel', 'CRM analytique'], [0.5, 0.5], [
  ['Soutien au **service clientèle** et aux **centres d\'appels** ; **automatisation** des tâches', '**Analyse des données clients** produites par la partie opérationnelle → **gestion de la performance** de l\'entreprise'],
], { firstColBold: false });
P('Principaux éditeurs : Salesforce, Zoho CRM, Microsoft Dynamics CRM, SAP CRM, Oracle CRM.');

RETENIR([
  'Passage du marketing **transactionnel** (produit, masse, CA) au marketing **relationnel** (relation, individualisation, fidélisation).',
  'Le SI marketing agit aux 3 niveaux : **opérationnel** (ventes, promotions, prix), **gestion** (tableaux de bord, BI, simulation), **stratégique** (données externes : Insee, Kompass, OCDE).',
  'Trois outils : **e-commerce** (B to C), **EDI / WebEDI** (B to B), **CRM**.',
  'E-commerce : **196,4 Md€** en 2025 ; traces de navigation exploitables **avec consentement (RGPD)** ; référencement **local**, **SEA** (payant), **SEO** (naturel).',
  '**EDI** = échange normé (EDIFACT) de documents entre SI, **sans ressaisie** ; **WebEDI** = via Internet.',
  '**CRM** : point de contact unifié ; ventes, service, marketing ; **score RFM** ; CRM **opérationnel** vs **analytique**.',
]);

// =====================================================================
// SÉANCE 5
// =====================================================================
H1('Séance 5 – SI des ressources humaines (SIRH)');
SRC('Support : « Systèmes d\'Information Ressources Humaines », S. Boulesnane.');

H2('1. Rappel : le SI, un objet multidimensionnel');
DEF("« Un SI est un ensemble organisé de ressources : matériel, logiciel, personnel, données, procédures… permettant d'**acquérir, de traiter, de stocker** des informations (sous forme de données, textes, images, sons, etc.) **dans et entre des organisations**. » (R. Reix, 2005)");
TBL(["Système d'information", 'Système informatique'], [0.6, 0.4], [[
  ['Dimension **informationnelle / fonctionnelle** : manipulation et production de l\'information', 'Dimension **technologique** : technologies matérielles et logicielles', 'Dimension **humaine et organisationnelle** : individus, procédures de travail, coordination, partenariats'],
  ['**Matériel** (*hardware*) : ordinateur', '**Logiciel** (*software*) : programmes'],
]], { firstColBold: false });
KEY("Le système informatique n'est que la **dimension technologique** du SI. Le SI se décline par fonction (production, marketing, finance, comptabilité, GRH) : pour la GRH, c'est le **SIRH**.");

H2('2. GRH et SIRH : définitions et évolution');
DEF("**Gestion des ressources humaines (GRH)** : ensemble de fonctions et de mesures visant à **mobiliser et développer les ressources du personnel** pour une plus grande efficacité, au profit de la **productivité** de l'organisation.");
DEF("**SIRH** (*HRIS, Human Resource Information System*) : ensemble de ressources et de dispositifs permettant de **collecter, stocker, traiter et diffuser** les informations nécessaires à la **gestion des ressources humaines** d'une organisation.");
UL([
  'Au départ : la **gestion de la paie**.',
  'Puis **élargissement du périmètre** sous l\'effet du contexte socio-économique et sanitaire : les **35 heures**, la **mondialisation** des groupes (harmoniser méthodes, outils, informations), la **crise sanitaire** et le **télétravail**, le **turn-over**.',
]);
P('Le SIRH s\'analyse selon les **trois mêmes dimensions** que le SI : humaine et organisationnelle, informationnelle et fonctionnelle, technologique.');

H2('3. Dimension humaine et organisationnelle');
TBL(["Acteurs internes à l'organisation", "Acteurs externes à l'organisation"], [0.5, 0.5], [[
  ['**Professionnels des RH** : spécialistes, DRH, managers RH', '**DSI** (direction des systèmes d\'information)'],
  ['**Conseil en SIRH** : ESN (entreprises de services numériques), cabinets d\'audit et de conseil', '**Éditeurs** de logiciels RH', '**Instances de contrôle** de l\'État'],
]], { firstColBold: false });
P("Le SIRH doit **s'adapter à l'organisation** (privée ou publique) : sa **taille**, son **secteur** d'activité ou métier, ses **besoins**, son **degré d'internalisation**, la **réglementation** en vigueur.");

H2('4. Dimension informationnelle et fonctionnelle');
H3('Les fonctions du SIRH');
P('**Quatre grandes familles** : (1) la gestion de la **paie** ; (2) la gestion des **prestations de travail** ; (3) la gestion des **prestations sociales** ; (4) la gestion de **l\'humain**.');
TBL(['Fonction', 'Contenu'], [0.24, 0.76], [
  ['Paie et rémunération', 'Heures travaillées, absences, congés, primes, cotisations sociales → **édition des bulletins de paie** et **virement des salaires**'],
  ['Formation', 'Maintenir son niveau de qualification, développer ou acquérir des **compétences**'],
  ['Recrutement', 'Automatiser la gestion des recrutements, de la **publication de l\'offre** à la **gestion des candidatures**'],
  ['Mobilité', 'Affectation à un nouveau poste (interne ou externe), évolution de poste, changement d\'environnement de travail'],
  ['Évaluation', 'Évaluation des objectifs et des compétences, **entretiens professionnels**, bilan, projections'],
  ['Santé et sécurité', 'Sécurité physique et mentale ; actions de prévention, d\'information et de formation'],
]);
UL([
  'Ces fonctions couvrent le **cycle de vie de l\'employé** : recrutement → intégration → développement → croissance → rétention → départ.',
  'Le SIRH a une **double fonction** : **partenaire administratif** (gestion courante de l\'activité) et **partenaire stratégique** (aide à la décision et à l\'innovation).',
]);

H3("L'intérêt d'un SIRH");
UL([
  '**Homogénéiser** les pratiques de gestion des salariés dans des groupes éclatés (établissements, filiales…) qui avaient chacun leurs logiciels.',
  '**Intégrer dans un même outil** paie, temps de travail, formation, entretiens individuels, évolution de carrière, compétences, recrutement…',
]);

H3('Les types d\'informations RH');
TBL(['Type', 'Caractéristiques', 'Exemples'], [0.18, 0.37, 0.45], [
  ['Formelles', '**Faciles** à formaliser et à renseigner', 'Fiche salarié : données personnelles (âge, adresse, diplômes) et professionnelles (date d\'embauche, ancienneté, formations suivies, salaire de base)'],
  ['Informelles', '**Difficiles** à formaliser : données qualitatives, difficilement évaluables', 'Compétences'],
  ['Sensibles', 'Données **personnelles** collectées, protégées par le **RGPD** (Règlement général sur la protection des données)', 'Toute donnée personnelle du salarié'],
]);
KEY("Une partie de l'information RH étant **informelle** (qualitative) et **sensible**, il est difficile de **digitaliser tous les processus RH**.");

H2('5. Dimension technologique');
H3('Les logiciels SIRH et leur évolution');
P('Exemples de solutions : **ProfilSoft**, **Human Sourcing**, **Aragon** (Aragon-eRH, avec un tableau de bord en libre-service), **HR Access**.');
IMG('sirh.png', 560, 'Évolution des outils du SIRH : de la paie à l\'intelligence artificielle.');

H3("L'apport de l'IA");
TBL(['Automatisation des tâches répétitives', 'Apprentissage automatique', "Personnalisation de l'expérience employé", 'Supports intelligents'], [0.25, 0.25, 0.25, 0.25], [
  ['Processus administratifs : gestion des absences, des congés…', 'Recrutement optimisé : analyse de grandes quantités de CV, facilite le **sourcing**', 'Adapter la gestion aux habitudes et préférences : formations ciblées, évolution de carrière', '**Chatbots** : assistance pour les questions fréquentes'],
], { firstColBold: false });

RETENIR([
  'Le SI a **3 dimensions** : informationnelle / fonctionnelle, technologique, humaine et organisationnelle. Le **système informatique** n\'en est que la partie technologique.',
  '**SIRH** = collecter, stocker, traiter, diffuser l\'information RH. Né de la **paie**, élargi par les 35 h, la mondialisation, le télétravail et le turn-over.',
  'Acteurs **internes** (professionnels RH, DSI) et **externes** (ESN et conseil, éditeurs, État).',
  '**4 familles** de fonctions : paie, prestations de travail, prestations sociales, gestion de l\'humain ; double rôle **administratif** et **stratégique**.',
  'Informations **formelles** / **informelles** / **sensibles (RGPD)** : tout n\'est pas facilement digitalisable.',
  'Évolution : paie (années 70) → progiciels par fonction (80) → **ERP** (90) → **portail libre-service** (2000) → outils nomades → **IA** (2020).',
]);

// =====================================================================
// SÉANCE 6
// =====================================================================
H1('Séance 6 – SI de la production et des achats');
SRC('Support : « Production et achats », B. Fuchs.');

H2('1. Introduction : ressources du SI et flux de l\'entreprise');
TBL(['Ressource du SI', 'Contenu'], [0.27, 0.73], [
  ['Informations', 'Événements (ex. : commandes) et données stockées (ex. : clients). C\'est la **matière première des traitements** : la connaissance de l\'organisation.'],
  ['Pratiques de travail', 'Individuelles ou collectives : tâches **automatisées** ou **confiées aux personnes** ; acteurs (utilisateurs, informaticiens). Elles décrivent les **rôles homme-machine** (dynamique du SI).'],
  ['Technologies numériques', 'Matériels et logiciels. Les logiciels **conservent les connaissances opératoires** de l\'organisation.'],
]);
P('Les fonctions de l\'entreprise (achat, stockage, production, vente, gestion du personnel, comptabilité et finances) sont reliées entre elles et aux acteurs externes (fournisseurs, clients, banque, organismes).');
KEY('**Les flux physiques s\'accompagnent toujours de flux d\'information.**');

H2('2. La production');
H3('Définition et ressources');
DEF("La **production** est la **transformation de ressources pour créer des biens ou des services**.");
UL([
  '**Bien** : séquence d\'opérations pour transformer des matières ou localiser des biens.',
  '**Service** : séquence d\'opérations sans nécessairement transformer des matières (mettre à disposition des produits ou des informations, modifier l\'état d\'une ressource : réparation, formation, transport…).',
  'Elle mobilise **4 types de ressources** : **équipements** (immobilier, machines, outillage), **personnel**, **matières premières** (matières, composants, énergie…), **informations techniques** (gammes, nomenclatures).',
  'De l\'idée au produit : recherche → études → méthodes → ordonnancement → lancement → production → contrôle qualité.',
]);

H3('Typologies de production');
TBL(['Typologie de fabrication', 'Caractéristiques'], [0.3, 0.7], [
  ['En mode projet', 'Très petites quantités, produits complexes (navire, avion)'],
  ['Discrète', 'Conception spécifique, volume variable, gammes complexes'],
  ['Répétitive', 'Produits standards, **forts volumes**'],
  ['Continue', '**Flux continu** (pétrole, métallurgie, textile, chimie)'],
]);
TBL(['Système productif', 'Principe'], [0.3, 0.7], [
  ['Série unitaire', 'Toutes les ressources sont mobilisées pour **un projet** (travaux publics, ouvrage d\'art, naval)'],
  ['Ateliers spécialisés', 'Les équipements assurant **une même fonction technique** sont réunis au même endroit'],
  ['Ligne de production ou d\'assemblage', 'Équipements agencés pour faire transiter un flux par **la même séquence** de postes'],
  ['Process', 'Transformation de matières premières (sidérurgie, pétrochimie, chimie lourde, agroalimentaire)'],
  ['Réseau', 'Transport de flux de matière, d\'énergie ou d\'information (EDF, SNCF, La Poste, Orange, transports en commun)'],
]);

H3('Que produire et combien ? Flux poussés et flux tirés');
P('La réponse dépend du **délai client** :');
TBL(['Mode de production', 'Caractéristiques'], [0.38, 0.62], [
  ['Sur stock, par anticipation totale (**flux poussés**)', 'Produits de grande consommation, délais courts ; repose sur la **prévision de la demande** → gestion des stocks nécessaire'],
  ['À la demande (**flux tirés**)', 'Produits spécifiques, complexes, délais longs ; **déclenchée par le client**'],
  ['Par anticipation partielle', 'Cas intermédiaire (restauration rapide, automobile)'],
]);

H2('3. Dimension information : les données techniques');
P('À partir des **commandes clients**, du **niveau de stock** et des **prévisions**, le **calcul des besoins** répond à trois questions : que faut-il fabriquer ? (→ **ordres de fabrication**) ; que faut-il approvisionner ? (nomenclatures → **commandes fournisseurs**) ; comment répartir le travail sur l\'appareil productif ? (gammes, postes de charge → **planification**).');
TBL(['Donnée technique', 'Définition'], [0.24, 0.76], [
  ['Produits, sous-produits, matières', 'Identifiés par une **référence**, un magasin, un point de stockage'],
  ['Poste de charge', '**Unité opérationnelle** de production : ensemble de postes de travail, machines, outils et opérateurs caractérisés par une qualification (**≠ poste de travail**, qui n\'en est qu\'un élément)'],
  ['Nomenclature', 'Relation **composé-composant** : description complète des composants d\'un produit fini ou semi-fini, avec la **quantité** de chaque composant nécessaire pour **une unité** du composé'],
  ['Gamme de fabrication', 'Séquence des **opérations** nécessaires pour fabriquer un produit (comparable à une recette de cuisine) : poste de charge utilisé, **temps alloué** homme et machine, outillages, schémas ou plans. Plusieurs gammes possibles pour un produit ; étroitement liée à la nomenclature'],
  ['Ordre de fabrication (OF)', 'Produit, **quantité**, **dates de début et de fin**'],
]);
IMG('nomenclature.png', 520, 'Nomenclature d\'une chaise : niveau 0 = produit fini ; niveaux 1 et 2 = produits semi-finis.');

H2('4. Planifier la production : du MRP à l\'ERP');
H3('Organisation de la production');
P('On évalue la demande (besoins clients + prévisions), puis on détermine :');
OL([
  'les quantités à fabriquer : **ordres de fabrication (OF)** ;',
  'les composants à commander aux fournisseurs : **ordres d\'achat (OA)** ;',
  'les **plans de charge** des ateliers de fabrication.',
]);

H3('Le MRP');
DEF("Le **MRP** (planification des ressources de production) associe **logiciels et base de données** pour planifier la production en fonction des **ressources disponibles** (matériel et personnel). Il calcule les besoins en **matières, machines et main-d'œuvre** à partir des prévisions de ventes et/ou des commandes clients. C'est l'**ancêtre de l'ERP**.");
NOTE('Sigle développé « Materials Resources Planning » dans le cours ; on rencontre aussi Material Requirements Planning (MRP I) et Manufacturing Resource Planning (MRP II).');
TBL(['Étape', 'Rôle'], [0.3, 0.7], [
  ['PIC – Plan industriel et commercial', 'Vision globale à **moyen terme** de l\'activité commerciale et productive ; traduit la stratégie → planification des ressources (investissements, personnel)'],
  ['PDP – Plan directeur de production', 'Vision à **court terme** : plan détaillé **par référence de produit et par période** ; équilibrage charges / capacités ; **base du calcul des besoins**'],
  ['Calcul des besoins', 'Besoins + stocks → **OF** ; besoins + nomenclatures → **OA** de matières premières ; prise en compte des délais d\'approvisionnement et de fabrication'],
  ['Planification de la fabrication', 'Adéquation **charges / capacités** : gammes (opérations, temps) + postes de charge (capacité) → **ordonnancement des OF**'],
]);
IMG('mrp.png', 470, 'Logique du MRP, d\'après A. Gratacap et P. Médan (2013).');

H3("L'ordonnancement : le diagramme de Gantt");
P('Les **jalons** fixent les dates prévues des opérations. L\'**ordonnancement** des opérations sur les postes de charge se représente par un **diagramme de Gantt** (temps en abscisse, postes de charge en ordonnée).');
IMG('gantt.png', 470, 'Exemple de diagramme de Gantt, d\'après A. Gratacap et P. Médan (2013).');

H3('Des MRP aux ERP');
UL([
  'La grande complexité des processus rend l\'**informatique incontournable** pour être réactif.',
  'L\'**ERP** intègre les principes du MRP et gère de façon **intégrée et automatisée** les processus et fonctions clés de l\'entreprise.',
  'Exemple **SAP** : enchaînement de processus **piloté par les événements**, qui mobilise 4 concepts : **événement**, **tâche / fonction**, **unité organisationnelle**, **ressource** (informationnelle ou physique).',
  'Flux SAP : client → commande → PIC → plan de production → calcul et lissage des besoins → lancement des approvisionnements → fournisseurs → réception des achats → transfert vers la production → production → déclaration de production → transfert vers l\'entrepôt → expédition → client.',
]);

H2('5. Achats, stocks et approvisionnement');
H3('Les stocks');
UL([
  '**Niveau de stock = entrées – sorties** (flux entrant / flux sortant).',
  'Objectifs : **satisfaire le client** dans un délai court ; **protéger** l\'entreprise contre l\'incertitude ; mieux **réguler** le processus productif et logistique ; réaliser des **économies d\'échelle**.',
  'Mais **le stock coûte cher** → stratégie d\'approvisionnement qui arbitre entre **coût de stockage** et **coût d\'approvisionnement**.',
  'Types de stocks : matières premières ; en-cours et composants ; produits finis et marchandises ; fournitures et consommables.',
]);

H3("L'approvisionnement");
P('Deux questions : **quand** approvisionner le stock ? **de combien** ? Elles dépendent de la **stratégie de production** (anticipation ou commande), du **niveau actuel** du stock, de la **nature du produit** et de la demande, et de la **demande future** (prévisions).');

H3('Le juste-à-temps (JAT)');
UL([
  'Inspiré du **modèle japonais des années 1980** (automobile) : un produit qui arrive trop tôt constitue du stock, en amont (fournisseurs) comme en aval (clients). On vise des **flux tendus**.',
  'Conséquence : **forte pression sur les fournisseurs**, qui doivent livrer à la date et surtout à l\'**heure** demandée.',
]);

H3('La chaîne logistique (supply chain)');
DEF("La **chaîne d'approvisionnement** ou **chaîne logistique** (*supply chain*) est un **système sociotechnique** qui assure le bon écoulement des flux de matières en renforçant les liens entre fournisseurs et clients. C'est un enchaînement de processus allant **des fournisseurs aux clients**, qui **dépasse les frontières de l'entreprise**.");
P('Elle suppose une **vision étendue et transversale** de l\'entreprise : planification, mise en œuvre et contrôle de l\'ensemble des **flux physiques** et des **flux d\'informations** correspondants, du fournisseur au client en passant par l\'entreprise.');

H3("L'EDI dans les achats");
P('L\'**EDI** dématérialise les échanges avec les clients et les fournisseurs, ce qui **accélère les échanges** : format de données **standardisé**, import et export directement dans le SI (voir séance 4).');

RETENIR([
  'Les **flux physiques** (achat → stock → production → vente) s\'accompagnent toujours de **flux d\'information**.',
  '**Production** = transformation de ressources (équipements, personnel, matières, informations techniques) en biens ou services ; **flux poussés** (sur stock, prévisions) vs **flux tirés** (à la commande).',
  'Données techniques : produits, **postes de charge**, **nomenclatures** (composé-composant), **gammes** (opérations), **ordres de fabrication**.',
  '**MRP** (ancêtre de l\'ERP) : **PIC** (moyen terme) → **PDP** (court terme) → calcul des besoins (**OF** + **OA**) → planification (**Gantt**).',
  '**Stock = entrées – sorties** ; arbitrage coût de stockage / coût d\'approvisionnement ; **JAT** = flux tendus.',
  '**Supply chain** = gestion des flux physiques et d\'information du fournisseur au client, au-delà de l\'entreprise.',
]);

// =====================================================================
// SÉANCE 7
// =====================================================================
H1('Séance 7 – SI et Internet des objets (IoT)');
SRC('Support : « SI et IoT », J. Saint-Samat.');

H2('1. Rappels : le SI dans la gestion');
H3('Les SI fonctionnels et leur intégration');
TBL(['SI', 'Rôle', 'Outils'], [0.2, 0.55, 0.25], [
  ['Comptable et financier', 'Gère les flux (factures, paiements, immobilisations, écritures) ; produit les **états financiers** (bilan, compte de résultat, trésorerie) et des indicateurs (rentabilité, marges, cash-flow). Le SI **financier**, plus large, intègre budget, prévisions, investissements et risques.', 'Sage, Cegid, SAP Finance'],
  ['Production', 'Planification des ressources, stocks et approvisionnements, suivi des ordres de production, maintenance des équipements', '**PPS** (*Production Planning System*), **GPAO** (gestion de la production assistée par ordinateur)'],
  ['Marketing et commercial', 'Collecte et analyse des données clients et ventes pour **segmenter** le marché, suivre la satisfaction, cibler les campagnes, prévoir la demande', '**CRM**, **SFA** (*Sales Force Automation*), BI'],
  ['Ressources humaines', 'Gestion administrative (paie, congés, contrats), recrutement, formation, évaluation et compétences', 'SIRH'],
  ['Logistique et achats', 'Suivre les flux de marchandises, gérer les stocks, planifier les approvisionnements, **optimiser les itinéraires** de livraison', '—'],
]);
KEY("Longtemps **séparés** (redondances, incohérences, pertes de temps), ces SI sont intégrés par l'**ERP** (SAP, Oracle, Microsoft Dynamics) : une commande saisie par le commercial déclenche automatiquement la production, la facturation et la mise à jour des stocks.");

H3("Flux d'information et prise de décision");
UL([
  "**3 types de flux** : **descendants** (de la direction vers la base : décisions), **ascendants** (de la base vers le sommet : remontée des ventes, des incidents), **transversaux** (entre services ou partenaires : production et logistique).",
  "**Cycle de l'information** : collecte → traitement → stockage → diffusion (rapports, alertes, tableaux de bord).",
  "**Qualité de l'information** : elle n'a de valeur que si elle est **fiable**, **pertinente**, **rapide**, **accessible** et **sécurisée**.",
  ['**3 niveaux de décision**, chacun soutenu par un type de SI :', [
    '**opérationnel** (traiter une commande) : les SI opérationnels automatisent les tâches de base ;',
    '**tactique** (ajuster la production) : les SI décisionnels (tableaux de bord, BI) analysent et prévoient ;',
    '**stratégique** (lancer un nouveau produit) : les SI stratégiques offrent simulation et aide à la planification.',
  ]],
]);

H3('Enjeux managériaux et limites des SI traditionnels');
UL([
  "Le **manager devient un acteur de l'information** : il formule ses besoins en données, interprète les indicateurs et veille à la circulation de l'information.",
  'Le SI **transforme le travail** : moins de tâches administratives, coordination plus transversale, métiers tournés vers l\'analyse, la communication et la supervision.',
  '**Limites des SI traditionnels** : informations pas toujours en **temps réel**, données **cloisonnées**, traitement lent et centralisé, **manque de visibilité sur le terrain**.',
]);
KEY("Les objets connectés y répondent en collectant des données **directement depuis le monde réel** (machines, produits, véhicules, bâtiments, personnes) : meilleur pilotage, décisions automatisées, nouveaux services et modèles économiques.");

H2("2. L'Internet des objets (IoT)");
H3('Définition et caractéristiques');
DEF("L'**Internet des objets (IoT)** désigne l'ensemble des **objets physiques** capables de **collecter, transmettre, recevoir et parfois traiter des données via Internet**, **sans intervention humaine directe**.");
UL([
  "Ces objets sont munis de **capteurs** (percevoir l'environnement : température, mouvement, pression, lumière…), de **connectivité** (envoyer et recevoir des données) et parfois d'une **intelligence embarquée** (analyser ou agir localement). Un objet connecté peut donc **observer, communiquer et parfois agir**.",
  "L'IoT **prolonge Internet dans le monde matériel** : Internet reliait des personnes (e-mails, réseaux sociaux) et des machines informatiques ; désormais les **objets physiques** rejoignent le réseau.",
  '**4 caractéristiques** qui le distinguent de l\'informatique traditionnelle : **ubiquité**, **autonomie**, **interconnexion**, **intelligence**.',
]);

H3('Le fonctionnement en 4 couches');
TBL(['Couche', 'Rôle', 'Contenu'], [0.17, 0.2, 0.63], [
  ['1. Perception', 'Le monde réel : capter et agir', '**Capteurs** (données physiques, biologiques, de position), **actionneurs** (ouvrir une vanne, allumer un moteur), **identifiants** électroniques (puces RFID, QR codes)'],
  ['2. Transmission', 'Faire circuler les données', 'Wi-Fi (rapide, espace restreint), Bluetooth (courte distance), 4G / 5G (objets mobiles ou distants), LoRa / Sigfox (faible consommation : villes intelligentes, capteurs agricoles), Ethernet ou fibre (objets industriels fixes)'],
  ['3. Traitement', 'Stocker et analyser', '**Cloud computing** : centraliser, traiter et croiser les données de milliers d\'objets. **Edge computing** : traiter **localement**, sur l\'objet ou à proximité, pour réduire le temps de réponse'],
  ['4. Application', 'Utilisation métier', 'Applications industrielles (supervision, maintenance), commerciales (marketing, expérience client), médicales (suivi, alertes), publiques (trafic, énergie, sécurité)'],
]);
IMG('iot.png', 600, "Les 4 couches d'un système IoT et son cycle : percevoir → transmettre → analyser → agir.");

H2("3. Les domaines d'application");
TBL(['Domaine', 'Apports', 'Exemples du cours'], [0.18, 0.37, 0.45], [
  ['Industrie (**industrie 4.0**, *smart factories*)', 'Produire plus efficacement, réduire et **anticiper les pannes**, garantir la qualité', '**Rolls-Royce, « Power by the Hour »** : des centaines de capteurs par moteur, maintenance anticipée ; le client paie **à l\'heure de vol** → la vente d\'un moteur devient un **service de propulsion**'],
  ['Logistique et supply chain (**traçabilité intelligente**)', 'Savoir où sont les produits, dans quelles conditions, à quel moment : GPS, capteurs de température, RFID, balances connectées', '**Chaîne du froid** : alerte automatique au-delà d\'un seuil (+4 °C), produit isolé ou livraison stoppée. **DHL** : véhicules connectés, itinéraires optimisés, **logistique prédictive**'],
  ['Commerce et marketing (**expérience client personnalisée**)', 'Suivre l\'usage réel des produits ; passer du marketing de masse au marketing **individualisé et contextuel** ; l\'objet devient un **point de contact permanent**', '**Nespresso** : machine connectée (recommandations, commande automatique, maintenance). **Decathlon** : RFID, passage en caisse automatique. **Amazon Go** : magasin sans caissier, achat « sans friction »'],
  ['Santé (**e-santé**)', 'Suivi continu des patients, détection précoce des anomalies, prévention des maladies chroniques', 'Montres et bracelets connectés (Apple Watch, Fitbit, Withings) ; équipements hospitaliers connectés au dossier médical électronique. Défis : **protection des données de santé**, cybersécurité, fiabilité'],
]);

H2("4. Avantages et limites de l'IoT");
TBL(['Avantages', 'Risques et limites'], [0.5, 0.5], [[
  [
    '**Efficacité opérationnelle** : capteurs à la place de la saisie manuelle (moins d\'erreurs), alertes automatiques, moins de temps morts, de rebuts et de gaspillage',
    '**Décision en temps réel** : on ne raisonne plus sur les chiffres du mois passé ; l\'entreprise devient « **temps réel** »',
    '**Relation client continue**, au-delà de l\'achat : vente d\'un **écosystème de services connectés**',
    '**Nouveaux modèles économiques** : facturation **à l\'usage** (*pay per use*), abonnements → l\'industriel devient une **entreprise de services**',
    '**Bénéfices collectifs** : villes (énergie, pollution, trafic, sécurité), santé publique, environnement → outil de **développement durable**',
  ],
  [
    '**Techniques** : objets vulnérables au **piratage**, réseaux instables, maintenance complexe',
    '**Économiques** : coût élevé ; **dépendance** aux fournisseurs et aux clouds étrangers (Amazon, Google, Microsoft) → **souveraineté numérique** ; frein pour les PME',
    '**Juridiques et éthiques** : masse de **données personnelles** (localisation, habitudes, santé) → propriété, usage, confidentialité, **RGPD**',
    '**Sociaux** : automatisation de certains emplois (logistique, maintenance, surveillance), mais nouveaux métiers (data analyst, ingénieur IoT, cybersécurité) → enjeu de **formation**',
  ],
]], { firstColBold: false, headerFill: C.accent });

H2("5. L'intégration de l'IoT dans le SI");
H3('Un SI qui change de nature');
TBL(['Critère', 'SI traditionnel', 'SI intégrant l\'IoT'], [0.16, 0.42, 0.42], [
  ['Nature', 'Fermé, centralisé', '**Ouvert, dynamique**, en interaction avec le monde physique'],
  ['Données', 'Saisies **manuellement, après coup** ; limitées, surtout quantitatives et comptables ; collecte coûteuse et lente', 'Mesurées **en continu** par des milliers d\'objets : **Big Data**, analysé par l\'**IA** en temps réel'],
  ['Pilotage', '**A posteriori** : l\'entreprise « constate » les événements (rapports périodiques)', '**En continu** : décisions automatisées ; le rôle du gestionnaire change'],
]);

H3("L'architecture du SI connecté");
OL([
  '**Capteurs et objets connectés** : couche physique ; données environnementales, d\'usage et de localisation, parfois plusieurs fois par seconde.',
  '**Connectivité et passerelles** (*gateways*) : elles traduisent les protocoles des objets (LoRa, Zigbee, Bluetooth…) vers le réseau de l\'entreprise (Ethernet, Wi-Fi, 4G, 5G).',
  '**Plateformes IoT** : collecte et normalisation des données, gestion des appareils, premier niveau d\'analyse (AWS IoT, Azure IoT Hub, Google Cloud IoT, ThingSpeak en open source).',
  '**Intégration au SI** : vers l\'**ERP**, le **CRM**, la **BI**, le **SCM** et le **MES** (*Manufacturing Execution System*) → vision unifiée des données physiques et administratives.',
]);

H3("Les apports de l'IoT au SI");
UL([
  '**Pilotage en temps réel** : tableaux de bord en direct, alertes automatiques → le management passe de **réactif** à **proactif**.',
  '**Automatisation** grâce au **M2M** (*machine to machine*) : machine qui s\'arrête en cas d\'anomalie, entrepôt qui recommande des pièces sous un seuil critique, chauffage qui s\'ajuste à la présence → SI **auto-régulé**.',
  '**Fiabilité et traçabilité** : données mesurées automatiquement (moins d\'erreurs humaines), **datées, localisées, vérifiables** (ex. : prouver le respect de la chaîne du froid lors d\'un contrôle).',
  '**Analyse et prévision** (BI, IA) : tendances cachées, pannes, demande, simulation de scénarios → **SI prédictif**, qui anticipe le futur au lieu de décrire le passé.',
]);

H3('Transformations organisationnelles et enjeux');
UL([
  'Organisation **data-centric** : décisions fondées sur la donnée, pôles de *data management*, coopération accrue entre services, nouvelles compétences dans tous les métiers.',
  'Le **DSI** gère désormais un écosystème connecté et distribué ; le **CDO** (*Chief Data Officer*) devient le garant de la qualité, de la cohérence et de la **gouvernance des données**.',
  'Nouveaux métiers : analyste IoT, ingénieur de la donnée, expert cybersécurité, responsable d\'innovation digitale.',
]);
TBL(['Enjeu', 'Réponses'], [0.25, 0.75], [
  ['Sécurité', 'Chaque objet est un point d\'entrée pour un pirate : **chiffrement** des communications, **authentification** des objets, mises à jour, supervision du réseau'],
  ['Gouvernance des données', 'À qui appartiennent les données ? Qui y accède ? Combien de temps les garder ? Pour quels usages ? → classification, règles d\'accès, **RGPD**, archivage'],
  ['Complexité d\'intégration', 'Compatibilité des formats, **interopérabilité**, flux massifs, technologies qui évoluent vite → architectures souples fondées sur des **API** et des standards ouverts'],
  ['Accompagnement humain', 'Expliquer les bénéfices, rassurer (emploi, surveillance), former aux nouveaux outils'],
]);
KEY('« Sans gouvernance, la donnée devient un **fardeau** plutôt qu\'une richesse. »');

RETENIR([
  '**IoT** = objets physiques qui **collectent, transmettent, reçoivent et parfois traitent** des données via Internet, sans intervention humaine directe (capteurs + connectivité + parfois intelligence embarquée).',
  '4 couches : **perception → transmission → traitement (cloud / edge) → application** ; cycle **percevoir, transmettre, analyser, agir**.',
  'Il répond aux **limites des SI traditionnels** : pas de temps réel, données cloisonnées, manque de visibilité terrain.',
  'Exemples : Rolls-Royce (*Power by the Hour*), chaîne du froid, DHL, Nespresso, Decathlon (RFID), Amazon Go, e-santé.',
  '**+** efficacité, décision en temps réel, relation client continue, **modèles à l\'usage** ; **–** sécurité, coût et dépendance, données personnelles (RGPD), emploi.',
  'Le SI devient ouvert, temps réel, **auto-régulé (M2M)** et **prédictif** ; enjeux : sécurité, **gouvernance des données** (CDO), interopérabilité (API), accompagnement du changement.',
]);

// =====================================================================
// SÉANCE 8
// =====================================================================
H1("Séance 8 – Les métiers des systèmes d'information");
SRC("Support : « Métiers des systèmes d'information (SI) », É. Lavoué.");

H2('1. Le SI, un secteur porteur');
UL([
  "Le SI est l'**élément central** de l'organisation : il améliore la productivité, aide à mettre en œuvre la stratégie, favorise la collaboration interne et externe.",
  'Les métiers du SI couvrent toutes les actions liées aux données : **collecte, stockage, traitement et partage**.',
  'On les exerce partout : cabinets de conseil, **ESN** (entreprises de services numériques), grandes entreprises, PME/PMI, éditeurs de logiciels (Microsoft, Adobe, Oracle)…',
  'Secteur **pointu** (expertise), **dynamique très favorable à l\'emploi** (difficultés de recrutement), nombreuses évolutions de carrière.',
  'Les métiers évoluent avec les **innovations** : intelligence artificielle, cloud, big data, machine learning (voir séance 9).',
]);

H2('2. La nomenclature du Cigref');
DEF("Le **Cigref** (association loi 1901 créée en 1970) réunit près de **150 grandes entreprises et administrations** françaises et les accompagne sur les enjeux du numérique. Il publie une **nomenclature des profils métiers du SI**, régulièrement mise à jour, qui sert de référence à ce cours.");
UL([
  'Évolution : avant 2009, des familles organisées en **silos techniques** (conseil, développement, expertise, exploitation, support) ; après 2009, une organisation **en couches** transversales.',
  'Depuis 2018 : **9 familles** pour **50 métiers**.',
  'Chaque **profil métier** se décrit par : un titre → une **mission** → des **activités** → des **domaines de compétences** (déclinés en niveaux de responsabilité, appuyés sur des connaissances et savoir-faire) → des notions transversales → des **livrables** → des **indicateurs de performance (KPI)** → un parcours professionnel → des tendances d\'évolution.',
]);

H2('3. Les 9 familles de métiers');
TBL(['Famille', 'Rôle', 'Exemples de métiers'], [0.25, 0.33, 0.42], [
  ['1. Pilotage, organisation et gestion des évolutions du SI', 'Mise en **cohérence organisationnelle et fonctionnelle** du SI avec la stratégie', '**Consultant en SI**, urbaniste des SI, responsable du SI « métier », gestionnaire d\'applications, chargé d\'affaires internes, architecte d\'entreprise, **responsable Green IT**'],
  ['2. Management de projet', '**Piloter, suivre et coordonner** les projets SI (travaux, ressources, communication)', 'Directeur de projets, chef de projet MOA, **chef de projet MOE**, coach agile, Scrum master, product owner, chargé de pilotage SI (PMO)'],
  ['3. Cycle de vie des applications', '**Conception, développement, réalisation technique** des solutions : les « briques » du SI, pas son organisation', 'Responsable des systèmes applicatifs, **concepteur / développeur**, testeur, intégrateur d\'applications, paramétreur de progiciels'],
  ['4. Mise à disposition et maintenance des infrastructures', 'Étude, conception, intégration et **exploitation des infrastructures** ; support IT interne à la DSI', '**Technicien d\'exploitation**, technicien poste de travail ou réseaux-télécoms, administrateurs (systèmes, réseaux, bases de données), pilote d\'exploitation, architecte technique'],
  ['5. Support et assistance', '**Assistance et accompagnement** des utilisateurs du SI', 'Assistant fonctionnel, technicien support utilisateurs, **expert méthode et outils / qualité**'],
  ['6. Sécurité', 'Définition, expertise, **audit**, mise en place et contrôle de la **cybersécurité**', '**Expert en cybersécurité**, auditeur SSI, **RSSI** (responsable de la sécurité des SI)'],
  ['7. Management opérationnel', '**Responsabilité hiérarchique** : RH, budget, décision, périmètre', '**DSI**, responsables d\'entité, télécoms, d\'exploitation, d\'études ; *Chief Digital Officer* ; responsable marketing de la DSI'],
  ['8. Données', '**Cycle de gestion de la donnée**', 'Data scientist, **data analyst**, *Chief Data Officer*, data engineer, **DPO** (délégué à la protection des données)'],
  ['9. Relations fournisseurs', '**Achats**, gestion des **contrats** et des **licences**', '**Manager de contrats**, acheteur IT, *Software Asset Manager* (SAM), *vendor manager*'],
]);
NOTE('En gras : les métiers détaillés en cours. Attention, le sigle CDO désigne soit le Chief Digital Officer (famille 7), soit le Chief Data Officer (famille 8, vu aussi en séance 7).');

H2('4. Zoom sur quelques métiers');
TBL(['Métier', 'Mission', 'Salaire brut annuel'], [0.22, 0.62, 0.16], [
  ['Consultant en SI', 'Anticipe et fait mûrir les nouveaux projets (apport des technologies, analyse prospective des processus) ; assiste la **maîtrise d\'ouvrage** dans la définition des besoins et des solutions', '35 – 51 k€'],
  ['Responsable Green IT', 'Construit un SI **(éco)responsable** ; élabore et fait évoluer la stratégie **RSE** de l\'entreprise côté SI, avec le DSI et le directeur du développement durable ; pilote la stratégie Green IT', '55 – 80 k€'],
  ['Chef de projet MOE', 'Définit, met en œuvre et conduit un projet SI **de la conception à la réception**, conformément aux exigences de la MOA (qualité, performance, coût, délai, sécurité)', '43 – 58 k€'],
  ['Concepteur / développeur', 'À la demande du métier, **analyse, paramètre et code** les composants logiciels, dans le respect des normes et procédures', '45 – 63 k€'],
  ['Technicien d\'exploitation', 'Assure la **gestion courante de l\'exploitation** (hors réseau) et surveille les équipements du centre de production informatique', '—'],
  ['Expert méthode et outils / qualité', 'Référent de son domaine : conseil, assistance, formation, **alerte sur les risques** ; veille technologique ; interlocuteur des experts externes', '45 – 65 k€'],
  ['Expert en cybersécurité', 'Définit et met en œuvre les **dispositifs techniques de sécurité**, conformément à la politique de sécurité et aux réglementations ; veille, conseil, alerte sur les risques', '40 – 72 k€'],
  ['DSI', 'Garant de l\'**alignement du SI sur la stratégie** ; responsable de la conception, de la mise en œuvre, de la sécurité et de la qualité du SI ; fixe les grandes évolutions, maîtrise les coûts, décide des investissements', '90 – 250 k€'],
  ['Data analyst', 'Met en œuvre outils informatiques et **méthodes statistiques** pour organiser et traduire les données métiers ; produit les **indicateurs de performance** utiles à la décision', '50 – 80 k€'],
  ['Manager de contrats', 'Optimise les **achats de la DSI** : compétitivité et équité des contrats, suivi des fournisseurs, sous-traitance (TMA, infogérance)', '51 – 70 k€'],
]);
NOTE('Salaires indicatifs relevés entre 2020 et 2024 selon les sources citées dans le cours.');

H3('Deux notions à connaître : Green IT et projet');
DEF("**Green IT** : ensemble des technologies dont l'usage permet de **réduire les effets nocifs de l'activité humaine sur l'environnement**. Objectif : réduire l'impact environnemental du numérique (consommation énergétique, empreinte carbone, gaz à effet de serre, déchets électroniques).");
TBL(['Notion', 'Définition'], [0.24, 0.76], [
  ['Projet', 'Ensemble d\'actions pour répondre à un **besoin défini**, avec une qualité suffisante, dans un **délai fixé**, mobilisant des ressources humaines et matérielles, et ayant un **coût**'],
  ['Maître d\'ouvrage (MOA)', 'Personne physique ou morale **propriétaire de l\'ouvrage** : elle fixe les **objectifs**, le **budget** et les **délais**'],
  ['Maître d\'œuvre (MOE)', 'Personne qui reçoit mission de la MOA pour **concevoir et réaliser** l\'ouvrage'],
  ['Conduite de projet', 'Organisation méthodologique qui garantit que l\'ouvrage réalisé par la MOE répond aux attentes de la MOA, **dans les contraintes de délai, coût et qualité**'],
]);

H2('5. Les compétences transversales');
P('Communes à tous les métiers, de la simple sensibilisation à l\'engagement proactif, elles couvrent **7 domaines** : **accessibilité**, **éthique**, **questions juridiques** liées aux TIC, **respect de la vie privée**, **sécurité**, **développement durable**, **utilisabilité**.');
P('En conclusion : des métiers variés (compétences, responsabilités, secteurs), en **forte demande**, dans un domaine qui évolue vite. Le master MSI de l\'iaelyon prépare à cette **double compétence métier et technique** (consultant, directeur de projet, DSI, responsable Green IT…).');

RETENIR([
  'Les métiers du SI couvrent la **collecte, le stockage, le traitement et le partage** des données ; secteur porteur, présent partout (ESN, cabinets, entreprises, éditeurs).',
  'Référence : la **nomenclature du Cigref**, **9 familles et 50 métiers** depuis 2018 (organisation en couches depuis 2009).',
  'Les 9 familles : pilotage du SI, management de projet, cycle de vie des applications, infrastructures, support, sécurité, management opérationnel, données, relations fournisseurs.',
  'Métiers phares : consultant SI, chef de projet MOE, développeur, expert cybersécurité / RSSI, **DSI** (alignement SI-stratégie), data analyst, DPO, responsable **Green IT**.',
  '**MOA** = propriétaire (objectifs, budget, délais) ; **MOE** = conçoit et réalise ; projet = besoin + délai + ressources + coût.',
  '**7 compétences transversales** : accessibilité, éthique, juridique, vie privée, sécurité, développement durable, utilisabilité.',
]);

// =====================================================================
// SÉANCE 9
// =====================================================================
H1("Séance 9 – Perspectives de l'IA sur les SI");
SRC("Support : « Perspective IA sur les SI… et perspectives d'actualité », B. Fuchs.");

H2("1. Qu'est-ce que l'intelligence artificielle ?");
H3("Du programme à l'IA");
UL([
  'Un ordinateur est une « machine stupide » : il se contente d\'**exécuter des programmes**, grâce à une mémoire (données et programmes) et à des circuits électroniques.',
  "L'« intelligence » vient du **programme**, qui applique une méthode, l'**algorithme**, conçue par le programmeur.",
  "**Limite** : un programme ne réalise qu'**une tâche bien définie** et enferme des connaissances. D'où l'idée de **sortir les connaissances** dans une **base de connaissances**, exploitée par des programmes **génériques** capables de résoudre n'importe quel problème.",
]);

H3('Définitions et approches');
DEF("Il n'existe pas de définition consensuelle. L'**IA** consiste à **doter les machines de capacités** leur permettant d'effectuer des tâches réputées « intelligentes » car réalisées par des humains : concevoir des systèmes capables de **raisonner** pour résoudre un problème en **exploitant des connaissances**.");
UL([
  'Hypothèse : une tâche intelligente suppose des **connaissances** et des **mécanismes de raisonnement** qui les exploitent.',
  'Un système d\'IA sait : acquérir de l\'information ; raisonner, résoudre des problèmes, planifier ; expliquer et communiquer ; comprendre le langage naturel ; apprendre et découvrir.',
  '**Test de Turing** : un interrogateur humain dialogue sans les voir avec un humain et avec un système d\'IA ; s\'il ne parvient pas à distinguer la machine de l\'humain, la machine est jugée intelligente.',
]);
TBL(['', 'Centré sur l\'humain', 'Performance idéale (rationnel)'], [0.24, 0.38, 0.38], [
  ['Pensée et raisonnement', 'Systèmes qui **pensent comme les humains**', 'Systèmes qui **pensent de façon rationnelle**'],
  ['Comportement', 'Systèmes qui **se comportent comme les humains**', 'Systèmes qui **se comportent de façon rationnelle**'],
]);

H3('Repères historiques');
TBL(['Période', 'Repères'], [0.2, 0.8], [
  ['Antiquité', '**Aristote** analyse le raisonnement valide : le **syllogisme** (« Tous les hommes sont mortels, Socrate est un homme, donc Socrate est mortel »), mais aussi l\'analogie'],
  ['Avant 1956', 'Travaux précurseurs : réseaux de neurones artificiels, cybernétique, théorie de l\'information, **Turing**, *Logic Theorist* (Simon et Newell)'],
  ['1956', '**Conférence de Dartmouth** : « naissance » de l\'IA (Minsky, McCarthy) ; *General Problem Solver* (Simon et Newell)'],
  ['1960-1980', 'Délimitation du domaine, traduction automatique ; prise de conscience de la difficulté et **premières désillusions** ; coup d\'arrêt aux réseaux de neurones ; premiers **systèmes experts**'],
  ['1980-1990', 'Essor des systèmes experts, puis « **hiver de l\'IA** » (promesses non tenues, fin des financements) ; émergence de l\'apprentissage, IA distribuée'],
  ['1990-2000', 'Fin des systèmes experts, retour des réseaux de neurones, fouille de données ; **1997 : Deep Blue bat Kasparov** aux échecs'],
  ['XXIe siècle', '1989 : le web (Tim Berners-Lee) ; 2001 : **web sémantique** ; 2005 : véhicules robotisés ; **2012 : deep learning** ; **2016 : AlphaGo**'],
]);

H3('Capacités et applications');
P('**Capacités** : traitement du langage naturel (communiquer), représentation des connaissances (stocker), raisonnement (répondre, conclure), apprentissage automatique (s\'adapter), vision artificielle (percevoir), robotique (manipuler, se déplacer).');
TBL(['Domaine', 'Applications'], [0.22, 0.78], [
  ['Commerce et marketing', 'Segmentation de la clientèle, profil du consommateur, **analyse du panier de la ménagère**, rétention des clients, prédiction des ventes, détection des fraudes, clients à risque'],
  ['Finance', 'Corrélations entre indicateurs financiers, optimisation du rendement de portefeuilles d\'actions'],
  ['Ressources humaines', 'Prévision du plan de carrière, aide au recrutement'],
  ['Industrie', 'Détection et diagnostic de pannes et de défauts, analyse des flux dans les réseaux de distribution'],
  ['Sciences', 'Diagnostic médical, génome, chimie et pharmacie, astronomie'],
  ['Résolution de problèmes', 'Planification (emploi du temps, production), recherche de chemin (routage, télécoms), jeux (échecs, go)'],
]);

H2('2. Résoudre des problèmes');
UL([
  'Un problème se modélise par **P = (D, O, B)** : **D** = données ou état initial ; **B** = but ou état final ; **O** = opérateurs qui font passer d\'un état à un autre.',
  'L\'**espace d\'états** est l\'ensemble des configurations possibles. **Résoudre**, c\'est trouver un **chemin** de D à B dans cet espace, en général celui de **coût minimal**.',
  'Exemple des échecs : avec p coups possibles par position, explorer n coups d\'avance représente p^{n} états. Pour n = 100, environ 2^{100} ≈ 10^{30} opérations : à une opération par microseconde, 3 × 10^{16} ans, plus de 2 millions de fois l\'âge de l\'univers.',
]);
KEY("Explorer tout l'espace d'états est impossible : l'IA doit **mobiliser des connaissances** pour guider la recherche.");

H2('3. Représenter les connaissances et raisonner');
H3('Les systèmes à base de connaissances (SBC)');
UL([
  'Principe : **représenter = stocker + raisonner**. On abstrait le problème du monde réel, on le représente ; des **inférences** exploitent la **base de connaissances** pour produire une solution, que l\'on interprète.',
  'La connaissance est représentée de façon **explicite** (base indépendante du programme) et **déclarative** (on comprend ce qu\'elle exprime sans faire tourner de programme).',
  'Un bon formalisme est **correct** (toute description a un sens) et **cohérent** (toutes les connaissances sont vraies simultanément).',
  'Formalismes : procéduraux (Lisp), **logiques** (calcul des propositions, des prédicats, Prolog), **règles de production** (systèmes experts), structurels (frames, objets, réseaux sémantiques), distribués (systèmes multi-agents).',
]);

H3("Les modes d'inférence");
DEF("L'**inférence** est le mécanisme qui permet de passer d'un ensemble de principes à une **conclusion**.");
TBL(['Mode', 'Sens', 'Exemple du cours'], [0.17, 0.3, 0.53], [
  ['Déduction', 'Du **général au particulier**', 'Tous les hommes sont mortels ; Socrate est un homme → Socrate est mortel'],
  ['Induction', 'Du **particulier au général**', 'Marie fume et a un cancer → tout fumeur a un cancer (généralisation risquée)'],
  ['Abduction', 'Des **effets vers les causes**', '—'],
  ['Analogie', 'Du **particulier au particulier**', 'Raisonnement à partir de cas (ci-dessous)'],
]);

H3('Systèmes experts et raisonnement à partir de cas');
UL([
  '**Système expert** = une **base de faits** (problème, solution) + une **base de règles** + un **moteur d\'inférence** qui sélectionne et applique les règles jusqu\'à obtenir une solution.',
  '**Règle de production** : « **SI** conditions **ALORS** actions » (ex. : SI importations en hausse ET exportations en baisse ALORS balance extérieure non équilibrée). Le moteur raisonne en **chaînage avant** (des faits vers les conclusions) ou **arrière** (des conclusions vers les faits).',
  '**Raisonnement à partir de cas (RàPC)** : résoudre un nouveau problème (**cible**) en **réutilisant la solution** d\'un problème déjà résolu (**source**) : on retrouve un cas similaire dans une **base de cas** (remémoration), puis on **adapte** sa solution. Utile sans théorie du domaine ; le système **apprend** de chaque problème résolu.',
  'Autres raisonnements : dans le temps et l\'espace, dans l\'incertitude, argumentation, révision d\'informations, systèmes multi-agents (décision collective, négociation)…',
]);

H2("4. Apprendre : l'apprentissage automatique");
DEF("L'**apprentissage automatique** (*machine learning*) consiste à **découvrir des règles à partir d'exemples**, en évaluant les performances obtenues.");
TBL(['Type', 'Principe', 'Méthodes'], [0.17, 0.5, 0.33], [
  ['Supervisé', 'Un spécialiste fournit les **classes** et des exemples significatifs ; la machine en déduit un **modèle prédictif** (classifieur) qui classe de nouveaux individus', 'Arbres de décision, random forest, réseaux de neurones, k plus proches voisins, régression, réseaux bayésiens, SVM, boosting'],
  ['Non supervisé', 'Sans assistance : la machine observe les individus, découvre **similarités et différences** et les **regroupe**', 'Clustering (k-means, CAH), réduction de dimension (ACP), réseaux de Kohonen'],
  ['Par renforcement', 'Un **agent** agit dans un environnement qui lui renvoie une **récompense** positive ou négative ; par essais répétés, il cherche à **maximiser la somme des récompenses**', '—'],
]);

H3("Exemples d'apprentissage supervisé");
UL([
  '**Ciblage d\'un mailing** : 2 à 5 % des prospects répondent habituellement. Un modèle appris sur les réponses à un produit similaire fait passer le taux de réponse de **3 %** (envoi au hasard) à **15 %** (envoi ciblé).',
  '**Credit scoring** : évaluer la capacité d\'un emprunteur à rembourser, à partir de l\'historique des prêts. Autres usages : détection des spams, des fraudes, ciblage des contrôles fiscaux.',
  '**Arbre de décision** : on classe un nouvel exemple en suivant des tests successifs.',
]);
IMG('arbre_decision.png', 430, 'Arbre de décision du cours : qui achète une moto ?');
NOTE('Lecture : une femme → non ; un homme de moins de 40 ans → oui. Jacques (30 ans) est classé acheteur… et Kevin (3 ans) aussi : un modèle ne vaut que par la pertinence de ses données et de ses critères.');

H3('Réseaux de neurones et deep learning');
UL([
  '**Réseau de neurones artificiels** : inspiré du système nerveux. Chaque neurone reçoit des **entrées numériques** pondérées par des **poids**, calcule leur **somme pondérée**, puis applique une **fonction d\'activation**. Les poids s\'ajustent par l\'expérience.',
  '**Deep learning** (apprentissage profond) : réseaux à **nombreuses couches** (« profond » = nombre de transformations entre l\'entrée et la sortie), utilisés en reconnaissance de formes : vision, parole, langage naturel, audio, bio-informatique.',
]);

H2('5. Extraire des connaissances des données (ECD)');
DEF("L'**ECD** (extraction de connaissances à partir de données, ou fouille de données) relève de l'**informatique décisionnelle** : exploiter de **gros volumes de données** pour y trouver des **régularités** interprétables comme des **connaissances nouvelles**, au service de la décision.");
IMG('ecd.png', 600, "Le processus d'ECD.");
UL([
  'Applications typiques : **analyse du panier de la ménagère**, fidélisation des clients, publicité ciblée, détection des fraudes.',
  'Panier de la ménagère : à partir des tickets de caisse, on cherche les **itemsets fréquents** (produits souvent achetés ensemble) et des **règles d\'association** (exemple du cours : « si achat de couches, alors achat de bières dans 90 % des cas »).',
]);

H2('6. Le web sémantique');
UL([
  '2001 : faire évoluer le web pour que **machines et humains travaillent mieux ensemble**, en enrichissant les ressources de **données structurées**, identifiées de façon unique (**URI**) et **liées** entre elles (données liées).',
  'Langages : le web classique utilise **HTML** (documents et liens) et **CSS** (présentation) ; le web sémantique utilise **RDF / RDFS** et **OWL** (*Ontology Web Language*), qui décrivent l\'information en **triplets (sujet, prédicat, objet)**, par exemple « Arthur – est un ami de – Aline ».',
  'Application en gestion : **SCOR** (*Supply-Chain Operations Reference*), modèle standard mondial de gestion de la chaîne d\'approvisionnement, enrichi de données liées pour faciliter les échanges ; essentiel dans les **ERP**.',
  'Perspectives : systèmes capables d\'**introspection** (observer leur propre raisonnement), étude de l\'**émotion**, applications artistiques (musique, jeux).',
]);

RETENIR([
  'IA = doter les machines de capacités jugées « intelligentes » ; elle repose sur des **connaissances** et des **mécanismes de raisonnement** ; 4 approches (penser / agir × humain / rationnel) ; **test de Turing**.',
  'Repères : Aristote (syllogisme), **Dartmouth 1956**, systèmes experts puis « hiver de l\'IA », **Deep Blue 1997**, **deep learning 2012**, **AlphaGo 2016**.',
  'Problème = **(D, O, B)** ; résoudre = trouver un chemin dans l\'**espace d\'états**, souvent trop vaste pour être exploré entièrement.',
  'Inférences : **déduction** (général → particulier), **induction** (particulier → général), **abduction** (effets → causes), **analogie** (particulier → particulier). **Système expert** = faits + règles SI… ALORS + moteur d\'inférence ; **RàPC** = réutiliser et adapter un cas résolu.',
  'Apprentissage **supervisé** (classes connues → modèle prédictif), **non supervisé** (regroupement), **par renforcement** (récompenses) ; réseaux de neurones et **deep learning**.',
  '**ECD** : sélection → prétraitement → transformation → fouille → interprétation → connaissance (ex. : panier de la ménagère). **Web sémantique** : données liées, triplets RDF, SCOR.',
]);

// =====================================================================
// Assemble
// =====================================================================
const footer = new Footer({
  children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: L.CONTENT }],
    children: [
      ...runs("Systèmes d'information · L2 Économie-Gestion", { size: 16, color: C.muted }),
      new TextRun({ children: [new Tab(), PageNumber.CURRENT], size: 16, color: C.muted }),
    ],
  })],
});

const doc = new Document({
  creator: 'Cours de SI',
  title: "Systèmes d'information – L2 Économie-Gestion",
  description: 'Cours de synthèse, séances 1 à 9',
  styles: L.stylesConfig(),
  numbering: L.numberingConfig(),
  features: {},
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: 1134, bottom: 1134, left: MARGIN, right: MARGIN, footer: 567 } } },
    footers: { default: footer },
    children: [...cover, ...body],
  }],
});

const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(path.join(out, 'raw.docx'), buf);
  fs.writeFileSync(path.join(out, 'toc.json'), JSON.stringify(toc, null, 1));
  console.log('raw.docx written,', toc.length, 'headings');
});
