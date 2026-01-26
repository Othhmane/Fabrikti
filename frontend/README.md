
# Fabrikti Frontend - ERP Industriel

Ce frontend est conçu pour être une application de gestion industrielle robuste et scalable.

## Architecture Technique
- **React 18+** & **TypeScript**
- **Tailwind CSS** : Design atomique et responsive.
- **TanStack React Query** : Gestion du cache et des appels serveurs.
- **Zustand** : État global (thèmes, UI).
- **React Hook Form + Zod** : Validation stricte des formulaires.
- **Axios** : Client HTTP configuré.

## Branchement au Backend NestJS

1. **Variables d'Environnement**
   Créez un fichier `.env` à la racine :
   ```env
   VITE_API_URL=http://your-nestjs-api-url.com/api
   ```

2. **Endpoints Attendus**
   Le frontend appelle les endpoints suivants qui doivent être implémentés dans NestJS :
   - `GET /api/clients`, `POST /api/clients`, `PATCH /api/clients/:id`, `DELETE /api/clients/:id`
   - `GET /api/products`
   - `GET /api/orders`
   - `GET /api/raw-materials`
   - `GET /api/suppliers`
   - `GET /api/transactions`

3. **Compatibilité DTO**
   Les types TypeScript définis dans `types.ts` correspondent aux entités recommandées pour votre backend NestJS. Assurez-vous que vos `DTO` (Data Transfer Objects) renvoient les mêmes structures (ex: format ISO pour les dates).

4. **Authentification**
   Le client Axios est déjà configuré pour envoyer un token `Bearer` présent dans le `localStorage` sous la clé `token`.

## Lancement
```bash
npm install
npm run dev
```
