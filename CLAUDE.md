# StockPilot — Stock

Stack: React Native / Expo SDK 55, Expo Router (`app/`), Supabase (PostgreSQL + RLS), React Query, Zustand.
Commandes: `npm start` / `npm run ios` / `npm run android` / `npm run web`.

## Périmètre
`app/(app)/(tabs)/stock/` uniquement. Toute logique stock passe par `hooks/useProducts.ts`.

## Règles critiques
- Soft-delete uniquement (`is_active: false`), jamais DELETE produit.
- `stock_quantity >= 0` toujours (Math.max(0, newQty)).
- Multi-tenant : vérifier `!!storeId` avant toute mutation. `db` casté `as any` (pas de généric Supabase).
- `Alert.alert()` ne fonctionne pas sur web → utiliser `window.confirm()` sur `Platform.OS === 'web'`.
- Langue UI : français exclusivement. Couleur primaire : `#FFCA28`.
- Erreurs Supabase : toujours `if (error) throw error`, message utilisateur en français.
