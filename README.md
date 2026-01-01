# EcoFlow Control Deck

[English](#english) | [Français](#français)

---

<a name="english"></a>
## English

A Stream Deck plugin to monitor and control EcoFlow power stations directly from your Elgato Stream Deck.

**"See and control your EcoFlow with one click from Stream Deck."**

### Features

#### Display (Read-only)
- **Battery Status** - Current battery percentage with charging indicator
- **Input Power** - Total power input (AC + Solar)
- **Output Power** - Total power consumption
- **Solar Power** - Solar panel input with sun indicator
- **Device Status** - Online/Offline status

#### Control
- **AC Output Toggle** - Turn AC outlets on/off
- **DC/USB Toggle** - Turn DC and USB ports on/off
- **AC Charge Toggle** - Enable/disable AC charging
- **Manual Refresh** - Force refresh device data

#### Visual Alerts
- Low battery warning (configurable threshold)
- High discharge warning
- Offline/error indication

### Requirements

- Stream Deck 6.9 or later
- Node.js 20 or later (for development)
- EcoFlow Developer API credentials

### Installation

#### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/LeMonsieurXav80/Ecoflow-StreamDeck.git
   cd Ecoflow-StreamDeck
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the plugin:
   ```bash
   npm run build
   ```
4. Link for development:
   ```bash
   npm run link
   ```
5. Restart Stream Deck:
   ```bash
   npm run restart
   ```

#### From Marketplace

Coming soon.

### Configuration

#### Getting API Credentials

1. Register at [developer.ecoflow.com](https://developer.ecoflow.com)
2. Request API access (approval may take a few days)
3. Create an Access Key and Secret Key in the Security section

#### Plugin Setup

1. Open Stream Deck application
2. Find "EcoFlow" category in the actions list
3. Drag an EcoFlow action to your deck
4. Click the action to open settings
5. Enter your Access Key and Secret Key
6. Select your region (US/Global or EU)
7. Save configuration

#### Action Configuration

Each action requires selecting an EcoFlow device from the dropdown. Make sure your API credentials are configured first.

### Supported Devices

- DELTA series (DELTA, DELTA 2, DELTA Pro, DELTA Max, DELTA 3, etc.)
- RIVER series (RIVER, RIVER 2, RIVER Pro, RIVER Max, RIVER 3, etc.)
- PowerStream (if API support confirmed)

### Limitations

- Requires EcoFlow Cloud connectivity
- Control features depend on API permissions
- Polling interval minimum 10 seconds (API rate limits)
- Some older devices may not support all features

---

<a name="français"></a>
## Français

Un plugin Stream Deck pour surveiller et contrôler les stations d'énergie EcoFlow directement depuis votre Elgato Stream Deck.

**"Voir et contrôler son EcoFlow en un clic depuis Stream Deck."**

### Fonctionnalités

#### Affichage (Lecture seule)
- **Battery Status** - Pourcentage de batterie avec indicateur de charge
- **Input Power** - Puissance d'entrée totale (AC + Solaire)
- **Output Power** - Consommation totale
- **Solar Power** - Entrée des panneaux solaires avec indicateur soleil
- **Device Status** - État en ligne/hors ligne

#### Contrôle
- **AC Output Toggle** - Activer/désactiver les sorties AC
- **DC/USB Toggle** - Activer/désactiver les ports DC et USB
- **AC Charge Toggle** - Activer/désactiver la charge AC
- **Manual Refresh** - Forcer le rafraîchissement des données

#### Alertes Visuelles
- Avertissement batterie faible (seuil configurable)
- Avertissement décharge élevée
- Indication hors ligne/erreur

### Prérequis

- Stream Deck 6.9 ou supérieur
- Node.js 20 ou supérieur (pour le développement)
- Identifiants API EcoFlow Developer

### Installation

#### Depuis les sources

1. Clonez ce dépôt :
   ```bash
   git clone https://github.com/LeMonsieurXav80/Ecoflow-StreamDeck.git
   cd Ecoflow-StreamDeck
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Compilez le plugin :
   ```bash
   npm run build
   ```
4. Liez pour le développement :
   ```bash
   npm run link
   ```
5. Redémarrez Stream Deck :
   ```bash
   npm run restart
   ```

#### Depuis le Marketplace

Bientôt disponible.

### Configuration

#### Obtenir les identifiants API

1. Inscrivez-vous sur [developer.ecoflow.com](https://developer.ecoflow.com)
2. Demandez l'accès à l'API (l'approbation peut prendre quelques jours)
3. Créez une Access Key et une Secret Key dans la section Security

#### Configuration du plugin

1. Ouvrez l'application Stream Deck
2. Trouvez la catégorie "EcoFlow" dans la liste des actions
3. Glissez une action EcoFlow sur votre deck
4. Cliquez sur l'action pour ouvrir les paramètres
5. Entrez votre Access Key et Secret Key
6. Sélectionnez votre région (US/Global ou EU)
7. Sauvegardez la configuration

#### Configuration des actions

Chaque action nécessite de sélectionner un appareil EcoFlow dans le menu déroulant. Assurez-vous que vos identifiants API sont configurés en premier.

### Appareils supportés

- Série DELTA (DELTA, DELTA 2, DELTA Pro, DELTA Max, DELTA 3, etc.)
- Série RIVER (RIVER, RIVER 2, RIVER Pro, RIVER Max, RIVER 3, etc.)
- PowerStream (si support API confirmé)

### Limitations

- Nécessite une connexion au cloud EcoFlow
- Les fonctions de contrôle dépendent des permissions API
- Intervalle de polling minimum 10 secondes (limites API)
- Certains appareils anciens peuvent ne pas supporter toutes les fonctionnalités

---

## Development / Développement

### Commands / Commandes

| Command | Description (EN) | Description (FR) |
|---------|-----------------|------------------|
| `npm run build` | Build the plugin | Compiler le plugin |
| `npm run watch` | Watch for changes | Surveiller les changements |
| `npm run dev` | Alias for watch | Alias pour watch |
| `npm run lint` | Run ESLint | Lancer ESLint |
| `npm run typecheck` | Check TypeScript types | Vérifier les types TypeScript |
| `npm run pack` | Package for distribution | Empaqueter pour distribution |
| `npm run link` | Link to Stream Deck | Lier à Stream Deck |
| `npm run restart` | Restart the plugin | Redémarrer le plugin |

### Project Structure / Structure du projet

```
├── src/
│   ├── plugin.ts              # Main entry point / Point d'entrée
│   ├── types.ts               # TypeScript types / Types TypeScript
│   ├── actions/               # Stream Deck actions
│   │   ├── battery-status.ts
│   │   ├── input-power.ts
│   │   ├── output-power.ts
│   │   ├── solar-power.ts
│   │   ├── ac-toggle.ts
│   │   ├── dc-toggle.ts
│   │   ├── charge-toggle.ts
│   │   ├── refresh.ts
│   │   └── device-status.ts
│   └── api/                   # EcoFlow API client
│       ├── ecoflow-client.ts  # REST API with HMAC-SHA256 auth
│       ├── device-manager.ts  # State management & caching
│       └── index.ts
├── com.ecoflow.control-deck.sdPlugin/
│   ├── manifest.json          # Plugin manifest
│   ├── ui/                    # Property Inspectors (HTML/JS/CSS)
│   └── imgs/                  # Icons (SVG)
├── package.json
├── tsconfig.json
└── rollup.config.mjs
```

---

## License / Licence

MIT

---

## Author / Auteur

[@LeMonsieurXav80](https://github.com/LeMonsieurXav80)
