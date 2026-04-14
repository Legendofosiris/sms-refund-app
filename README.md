# Formulaire de remboursement crédits SMS

Application Next.js pour calculer et soumettre les remboursements de crédits SMS clients, avec vérification automatique via Omni et envoi sur Slack.

## Déploiement sur Vercel

### 1. Pousser sur GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TON_ORG/sms-refund-app.git
git push -u origin main
```

### 2. Importer sur Vercel
1. Aller sur [vercel.com](https://vercel.com) → **Add New Project**
2. Importer le dépôt GitHub
3. Vercel détecte automatiquement Next.js, pas de config nécessaire

### 3. Ajouter la variable d'environnement
Dans Vercel → Settings → Environment Variables :

| Nom | Valeur |
|-----|--------|
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/services/...` (ton webhook Slack) |

### 4. Déployer
Cliquer sur **Deploy** — l'URL sera disponible en 1-2 minutes.

## Développement local

```bash
npm install
cp .env.example .env.local
# Renseigner ANTHROPIC_API_KEY dans .env.local
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Architecture

```
pages/
  index.js          → Formulaire frontend (React)
  api/
    check-client.js → Vérifie l'Organization ID via Omni MCP
    send-slack.js   → Envoie le résumé dans #C0AM2081VBL via Slack MCP
styles/
  Home.module.css   → Styles du formulaire
  globals.css       → Reset CSS
```

La clé API Anthropic est **uniquement côté serveur** (routes `/api/`). Elle n'est jamais exposée au navigateur.
