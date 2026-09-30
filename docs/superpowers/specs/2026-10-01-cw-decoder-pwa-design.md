# CW Decoder PWA — Design Specification

## Objectif

Créer une PWA iPhone légère permettant de décoder en temps réel la télégraphie CW reçue acoustiquement depuis le haut-parleur d'un poste radio (notamment Yaesu FT-710) ou d'un récepteur SDR, sans Xcode, sans application App Store et sans envoyer l'audio vers un serveur.

## Critère de réussite V1

L'utilisateur ouvre l'application sur l'iPhone, touche **Démarrer**, autorise le microphone, place l'iPhone près du haut-parleur du récepteur et obtient automatiquement :

- la tonalité BF CW suivie, en Hz ;
- une estimation de la vitesse en WPM ;
- le symbole Morse en cours (`·` / `−`) ;
- le texte décodé en temps réel ;
- un indicateur simple de niveau/confiance.

Le fonctionnement nominal ne doit demander aucun réglage préalable.

## Plateforme et contraintes

- PWA destinée en priorité à Safari/iOS et à l'installation via **Ajouter à l'écran d'accueil**.
- HTML, CSS et JavaScript natifs, sans framework applicatif.
- Web Audio API pour l'acquisition et le traitement audio.
- Hébergement statique HTTPS ; cible envisagée : `cw.pulsraider.com`.
- Tout le traitement audio s'effectue localement dans le navigateur.
- Aucun échantillon audio n'est envoyé ou stocké sur le serveur.
- L'accès microphone ne commence qu'après une action explicite de l'utilisateur.
- La V1 vise une seule émission CW dominante à la fois.
- La plage initiale de recherche de tonalité BF est **400 à 1000 Hz**.
- Le waterfall est explicitement hors périmètre V1.

## Architecture

### `index.html`

Contient la structure de l'interface et charge les modules JavaScript. L'interface doit rester utilisable d'une main sur iPhone et privilégier la lisibilité du texte reçu.

### `css/app.css`

Présentation responsive. Le texte décodé est l'élément visuel principal ; les informations techniques (Hz, WPM, confiance) restent immédiatement visibles sans dominer l'écran.

### `js/audio.js`

Responsable exclusivement de l'acquisition microphone et du graphe Web Audio : demande d'autorisation, création/arrêt de l'`AudioContext`, récupération des blocs d'échantillons et nettoyage des ressources à l'arrêt.

### `js/detector.js`

Analyse le signal dans la plage 400–1000 Hz. En mode AUTO, il recherche la tonalité CW dominante et suit progressivement sa fréquence. En mode LOCK, la fréquence suivie reste verrouillée afin d'éviter qu'un signal voisin ne capture le décodeur. Il produit un état clé ouverte/fermée, le niveau du signal, la fréquence suivie et une mesure de confiance.

### `js/morse.js`

Ne dépend pas du microphone. Il reçoit les transitions clé ouverte/fermée horodatées, estime la durée élémentaire (`dit`), en déduit la vitesse WPM, classe les impulsions en points/tirets et les silences en séparations intra-caractère, inter-caractère et inter-mot. Il traduit ensuite les séquences avec une table Morse internationale.

L'estimation de vitesse est adaptative afin de suivre un opérateur ou un signal dont la cadence varie progressivement, sans recalcul brutal à chaque élément.

### `js/app.js`

Coordonne l'interface, `audio.js`, `detector.js` et `morse.js`. Il ne contient pas les algorithmes DSP ou Morse eux-mêmes.

### `manifest.webmanifest` et `sw.js`

Rendent l'application installable et permettent de charger l'interface depuis le cache après une première visite réussie. Le microphone reste naturellement une ressource temps réel et n'est pas concerné par le cache.

## Flux de données

`Microphone → Audio/Web Audio → détection tonalité → état ON/OFF + timings → décodeur Morse → texte → interface`

Le détecteur et le décodeur sont séparés : il doit être possible de tester le décodeur Morse avec des transitions synthétiques sans microphone, et de tester le détecteur avec des signaux audio synthétiques sans dépendre de l'interface.

## Interface V1

L'écran principal contient :

- bouton **Démarrer / Stop** ;
- état microphone/décodeur ;
- mode **AUTO / LOCK** ;
- fréquence BF suivie en Hz ;
- WPM estimés ;
- niveau/confiance ;
- séquence Morse du caractère courant ;
- grande zone de texte décodé ;
- bouton **Effacer** ;
- bouton **Copier**.

AUTO est le mode initial. LOCK verrouille la fréquence actuellement suivie ; il n'introduit pas de sélecteur spectral dans la V1.

## Comportement en présence d'erreurs

- Autorisation microphone refusée : afficher une explication claire et laisser l'application réessayable.
- Aucun signal exploitable : conserver AUTO et afficher un état du type « Recherche CW » plutôt que produire des caractères aléatoires.
- Confiance insuffisante : ne pas valider de nouveau caractère.
- Perte momentanée de tonalité : ne pas changer immédiatement de fréquence suivie ; utiliser une courte hystérésis.
- Séquence Morse inconnue : l'indiquer comme caractère non reconnu sans interrompre le décodage.
- Passage en arrière-plan/verrouillage iOS : considérer la capture comme suspendue ; à la reprise, réinitialiser proprement les temporisations susceptibles d'être devenues invalides.

## Tests

Le moteur Morse doit être testé indépendamment avec des séquences temporelles synthétiques à plusieurs vitesses, notamment 10, 20 et 30 WPM, ainsi qu'avec une légère variation de cadence.

Le détecteur doit être validé avec des tonalités synthétiques dans et hors de la plage 400–1000 Hz, avec bruit ajouté et avec deux tonalités concurrentes afin de vérifier AUTO puis LOCK.

Les tests manuels iPhone couvrent : autorisation microphone, démarrage/arrêt répétés, FT-710 au haut-parleur, SDR au haut-parleur, passage arrière-plan/avant-plan, installation PWA et fonctionnement après rechargement.

## Hors périmètre V1

- waterfall/spectrogramme ;
- sélection tactile d'une porteuse dans un spectre ;
- connexion audio numérique directe au FT-710 ou au SDR ;
- enregistrement ou téléversement audio ;
- décodage simultané de plusieurs stations ;
- compte utilisateur, cloud ou historique serveur ;
- IA ou service de reconnaissance distant.

Ces fonctions pourront être envisagées seulement après validation de la qualité réelle du décodeur V1 sur des signaux radio.