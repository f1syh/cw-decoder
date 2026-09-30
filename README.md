# CW Decoder

PWA de décodage CW acoustique pour iPhone, destinée au haut-parleur d'un poste radio (dont FT-710) ou d'un SDR. Le traitement audio reste entièrement dans le navigateur.

## Développement

Prérequis : Node.js récent.

```bash
npm test
python3 -m http.server 8080
```

Le microphone sur iPhone nécessite un contexte HTTPS. Le déploiement cible est `cw.pulsraider.com` derrière un serveur HTTPS.

## Architecture

- `js/audio.js` : microphone Web Audio.
- `js/detector.js` : détection de tonalité CW 400–1000 Hz, AUTO/LOCK.
- `js/morse.js` : timings, WPM et alphabet Morse.
- `js/app.js` : orchestration et interface.
- `sw.js` + `manifest.webmanifest` : installation PWA et cache applicatif.

## Utilisation

Ouvrir le site dans Safari, toucher **Démarrer**, autoriser le microphone et placer l'iPhone près du haut-parleur. AUTO recherche la tonalité dominante ; LOCK conserve la fréquence actuellement suivie.