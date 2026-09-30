# CW Decoder PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire une PWA iPhone qui écoute acoustiquement la CW d'un FT-710 ou SDR, détecte automatiquement la tonalité et décode le Morse en texte en temps réel.

**Architecture:** Application statique modulaire. `audio.js` fournit les échantillons microphone, `detector.js` transforme le signal audio en états CW ON/OFF, `morse.js` transforme les timings en symboles et texte, et `app.js` coordonne l'interface. Les moteurs DSP et Morse restent indépendants du DOM afin d'être testables sous Node avec des signaux synthétiques.

**Tech Stack:** HTML5, CSS, JavaScript ES modules, Web Audio API, PWA manifest/service worker, Node.js built-in test runner (`node --test`) sans dépendance applicative.

**Spec:** `docs/superpowers/specs/2026-10-01-cw-decoder-pwa-design.md`

## Global Constraints

- Cible prioritaire : Safari/iOS, installation via **Ajouter à l'écran d'accueil**.
- HTML/CSS/JavaScript natifs, sans framework applicatif.
- Acquisition et traitement avec Web Audio API ; aucun audio envoyé ou stocké côté serveur.
- Le microphone ne démarre qu'après une action explicite de l'utilisateur.
- Recherche automatique limitée à **400–1000 Hz**.
- Une seule émission CW dominante décodée à la fois.
- AUTO au démarrage ; LOCK verrouille la fréquence suivie.
- Waterfall, cloud, IA, enregistrement audio et connexion numérique au poste sont hors V1.
- Hébergement final sous HTTPS, cible `cw.pulsraider.com`.

## Review Focus

- Bruit sans CW : le système doit rester en « Recherche CW » et ne pas inventer du texte — test détecteur + intégration.
- Signal CW proche des limites 400/1000 Hz : la détection doit rester valide à l'intérieur et rejeter l'extérieur — test détecteur.
- Deux porteuses concurrentes : AUTO choisit la dominante ; LOCK conserve la fréquence choisie malgré une concurrente plus forte — test détecteur.
- Cadence imparfaite/variable : le WPM doit évoluer progressivement sans casser la séparation caractères/mots — test Morse.
- Suspension/reprise iOS : les timings antérieurs ne doivent pas générer un faux caractère ou mot à la reprise — test contrôleur d'application + test manuel iPhone.

---

### Task 1: Socle PWA installable et interface statique

**Files:**
- Create: `index.html`
- Create: `css/app.css`
- Create: `manifest.webmanifest`
- Create: `sw.js`
- Create: `js/app.js`
- Create: `tests/pwa.test.js`
- Create: `package.json`

**Interfaces:**
- Consumes: aucune.
- Produces: éléments DOM identifiés `startStop`, `modeToggle`, `status`, `frequency`, `wpm`, `confidence`, `morseCurrent`, `decodedText`, `clearText`, `copyText`; fonction `registerServiceWorker()` dans `js/app.js`.

- [ ] **Step 1: Écrire les tests de structure PWA** vérifiant manifest lié depuis `index.html`, `display: standalone`, langue française, présence de tous les IDs d'interface et liste explicite des ressources statiques dans `sw.js`.
- [ ] **Step 2: Lancer `npm test`** et vérifier l'échec puisque les fichiers applicatifs n'existent pas.
- [ ] **Step 3: Créer le socle minimal** avec interface mobile, manifest, service worker cache-first pour les ressources statiques et `registerServiceWorker()` ; aucun accès micro au chargement.
- [ ] **Step 4: Lancer `npm test`** et obtenir PASS.
- [ ] **Step 5: Commit** `feat: add installable CW decoder PWA shell`.

### Task 2: Moteur Morse adaptatif indépendant

**Files:**
- Create: `js/morse.js`
- Create: `tests/morse.test.js`

**Interfaces:**
- Consumes: transitions `{ keyDown: boolean, timestampMs: number }` monotones.
- Produces: `createMorseDecoder(options?)` retournant `{ pushTransition(event), flush(timestampMs), reset(), getState() }`; `getState()` expose `{ ditMs, wpm, currentPattern, text, lastConfidence }`.

- [ ] **Step 1: Écrire les tests Morse** pour SOS à 10/20/30 WPM, espaces caractère/mot, séquence inconnue, variation progressive de cadence et `reset()` après une longue suspension.
- [ ] **Step 2: Lancer `node --test tests/morse.test.js`** et vérifier l'échec.
- [ ] **Step 3: Implémenter `createMorseDecoder()`** avec table Morse internationale, estimation adaptative du dit, classification point/tiret et seuils temporels basés sur 1/3/7 unités.
- [ ] **Step 4: Lancer `node --test tests/morse.test.js`** et obtenir PASS pour toutes les vitesses et variations.
- [ ] **Step 5: Commit** `feat: add adaptive Morse timing decoder`.

### Task 3: Détecteur de tonalité CW AUTO/LOCK

**Files:**
- Create: `js/detector.js`
- Create: `tests/detector.test.js`

**Interfaces:**
- Consumes: blocs `Float32Array`, `sampleRate`, mode `auto|lock` et éventuellement fréquence verrouillée.
- Produces: `createCwDetector({ minHz: 400, maxHz: 1000 })` retournant `{ process(samples, sampleRate, timestampMs), setMode(mode), reset(), getState() }`; état `{ keyDown, frequencyHz, level, confidence, mode }`.

- [ ] **Step 1: Écrire un générateur de tonalités synthétiques dans le test** et couvrir 400, 700 et 1000 Hz, tonalités hors bande, bruit seul, tonalité + bruit et deux tonalités concurrentes en AUTO/LOCK.
- [ ] **Step 2: Lancer `node --test tests/detector.test.js`** et vérifier l'échec.
- [ ] **Step 3: Implémenter le détecteur** avec analyse fréquentielle légère ciblée sur 400–1000 Hz, seuil de bruit adaptatif et hystérésis ON/OFF ; AUTO suit progressivement le pic dominant et LOCK fige la fréquence de référence.
- [ ] **Step 4: Lancer `node --test tests/detector.test.js`** et obtenir PASS, notamment absence de `keyDown` durable sur bruit seul.
- [ ] **Step 5: Commit** `feat: add auto lock CW tone detector`.

### Task 4: Capture microphone Web Audio

**Files:**
- Create: `js/audio.js`
- Create: `tests/audio.test.js`

**Interfaces:**
- Consumes: `navigator.mediaDevices.getUserMedia`, `AudioContext` et callback de blocs audio.
- Produces: `createAudioCapture({ onSamples, onState })` retournant `{ start(), stop(), reset() }`; états `idle|requesting|running|denied|error|suspended`.

- [ ] **Step 1: Écrire les tests avec doubles Web Audio** pour vérifier qu'aucune permission n'est demandée à l'import, que `start()` demande `{ audio: true }`, que refus et arrêt sont propres et que les pistes sont stoppées.
- [ ] **Step 2: Lancer `node --test tests/audio.test.js`** et vérifier l'échec.
- [ ] **Step 3: Implémenter `createAudioCapture()`** en isolant les API navigateur injectables pour les tests et en livrant les blocs `Float32Array` avec leur horodatage.
- [ ] **Step 4: Lancer `node --test tests/audio.test.js`** et obtenir PASS.
- [ ] **Step 5: Commit** `feat: add browser microphone capture`.

### Task 5: Intégration temps réel et gestion du cycle de vie iOS

**Files:**
- Modify: `js/app.js`
- Modify: `index.html`
- Create: `tests/app.test.js`

**Interfaces:**
- Consumes: `createAudioCapture`, `createCwDetector`, `createMorseDecoder` et IDs DOM de Task 1.
- Produces: contrôleur `createAppController(deps)` avec `{ start(), stop(), toggleMode(), clear(), copy(), handleVisibilityChange(hidden) }`.

- [ ] **Step 1: Écrire les tests d'intégration** : démarrage explicite, transitions détecteur→Morse, confiance insuffisante ignorée, AUTO/LOCK, effacement/copie, bruit sans texte et suspension/reprise qui réinitialise les timings.
- [ ] **Step 2: Lancer `node --test tests/app.test.js`** et vérifier l'échec.
- [ ] **Step 3: Implémenter le contrôleur** et le câblage DOM ; afficher « Recherche CW » sans signal, erreurs micro compréhensibles, fréquence/WPM/confiance et texte en temps réel.
- [ ] **Step 4: Lancer `npm test`** et obtenir PASS sur toute la suite.
- [ ] **Step 5: Commit** `feat: integrate realtime CW decoding UI`.

### Task 6: Validation PWA et documentation de déploiement

**Files:**
- Create: `README.md`
- Create: `docs/iphone-test-checklist.md`
- Modify: `sw.js` si nécessaire après validation des chemins.

**Interfaces:**
- Consumes: application complète Tasks 1–5.
- Produces: procédure de déploiement HTTPS et checklist reproductible FT-710/SDR/iPhone.

- [ ] **Step 1: Écrire dans `docs/iphone-test-checklist.md`** les essais manuels : permission micro, start/stop répétés, FT-710, SDR, AUTO/LOCK, arrière-plan/reprise, installation écran d'accueil, rechargement PWA.
- [ ] **Step 2: Écrire `README.md`** avec architecture, lancement local, tests, exigences HTTPS et cible `cw.pulsraider.com`.
- [ ] **Step 3: Lancer `npm test`** et vérifier PASS intégral.
- [ ] **Step 4: Servir localement les fichiers statiques** et vérifier qu'aucune ressource applicative référencée ne retourne 404 ; documenter que le microphone iPhone doit être testé sous HTTPS.
- [ ] **Step 5: Commit** `docs: add deployment and iPhone validation guide`.

## Definition of Done

- Toute la suite `npm test` passe.
- Aucun accès microphone n'a lieu avant **Démarrer**.
- Le moteur Morse passe les cas 10/20/30 WPM et variation de cadence.
- Le détecteur couvre 400–1000 Hz, bruit, concurrence AUTO/LOCK et hystérésis.
- Une suspension/reprise ne génère pas de texte parasite.
- La PWA est installable et la procédure HTTPS/iPhone est documentée.
- La validation acoustique réelle sur FT-710 et SDR reste la dernière étape utilisateur avant de déclarer la V1 validée radio.