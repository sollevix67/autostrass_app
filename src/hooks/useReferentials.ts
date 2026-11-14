/**
 * Chargement des referentiels utilises par les `<select>` des documents.
 *
 * Quatre vues ont besoin des memes listes de reference pour construire un
 * select lisible : le nom du client sur une commande, le numero d'une commande
 * sur une livraison, la vente concernee par un retour, le client d'une vente.
 *
 * Ces listes ne sont pas dupliquees dans chaque vue : le select est reconstruit
 * à chaque rendu, donc quatre `fetch` indépendants aboutiraient à quatre
 * appels identiques par session. Elles sont mises en cache ici pour la duree du
 * module, avec une seule requete concurrente par chemin.
 *
 * Le select ne lit que l'identifiant : un echec de chargement ne doit pas
 * empecher de saisir la vente elle-meme, seulement la selection rattachee. Le
 * hook n'expose donc volontairement pas d'état d'erreur.
 */

import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { ApiClient, ApiCommande, ApiVente } from '../services/contracts'

/** Etape du cache : `undefined` = jamais demande, `null` = demande en cours. */
type CacheEntry = { data: unknown[] | null; promise: Promise<unknown[]> | null }

const cache = new Map<string, CacheEntry>()

/**
 * Requete memoisee par chemin.
 *
 * Deux vues montees en meme temps (navigation rapide) partagent la meme
 * promesse : une seule requete part, les deux receives le meme tableau.
 *
 * Le cache ne distingue pas `T` : il ne sert qu'a eviter un second chargement
 * de la meme liste, et chaque appelant verifie le type qu'il attend. Le typer
 * ici figerait le type de la premiere reponse pour toutes les vues suivantes.
 */
function fetchOnce(path: string): Promise<unknown[]> {
  const existing = cache.get(path)
  if (existing?.data) return Promise.resolve(existing.data)
  if (existing?.promise) return existing.promise

  const promise = api
    // La requête appartient au cache, pas à l'un des composants abonnés.
    .get<unknown[]>(path)
    .then((data) => (Array.isArray(data) ? data : []))
    .then((data) => {
      const entry = cache.get(path)
      // La reference ne doit changer que si `invalidate` a ete appele entre-temps.
      if (entry?.promise === promise) cache.set(path, { data, promise: null })
      return data
    })
    .catch(() => {
      // Un échec ne constitue pas un référentiel vide valide : le montage
      // suivant doit pouvoir réessayer plutôt que réutiliser cette réponse.
      if (cache.get(path)?.promise === promise) cache.delete(path)
      return []
    })

  cache.set(path, { data: null, promise })
  return promise
}

/** Vide le cache : appelé après une écriture pour recharger les listes. */
export function invalidateReferentials(paths?: string[]): void {
  if (paths === undefined) {
    cache.clear()
    return
  }
  for (const path of paths) cache.delete(path)
}

/**
 * Charge un référentiel ; le démontage retire uniquement cet abonné.
 *
 * L'état ne contient que la réponse du réseau. Le cache est relu pendant le
 * rendu, pas dans l'effet : y ecrire declencherait un second rendu en cascade
 * (regle `react(set-state-in-effect)`), alors que la lecture est pure.
 */
function useReferential<T>(path: string): T[] {
  const [fetched, setFetched] = useState<{ path: string; rows: T[] } | null>(null)

  useEffect(() => {
    let active = true

    void fetchOnce(path).then((data) => {
      if (active) setFetched({ path, rows: data as T[] })
    })

    return () => {
      active = false
    }
  }, [path])

  // Deux sources, dans l'ordre de fraicheur : la reponse de cette instance,
  // sinon le cache partage (une autre vue a peut-etre deja charge la liste).
  if (fetched?.path === path) return fetched.rows
  return (cache.get(path)?.data as T[] | undefined) ?? []
}

/** Client du referentiel, precharges pour alimenter les selects. */
export function useClientOptions(): ApiClient[] {
  return useReferential<ApiClient>('/clients')
}

/** Commandes, pour rattacher une livraison a sa commande. */
export function useCommandeOptions(): ApiCommande[] {
  return useReferential<ApiCommande>('/commandes')
}

/** Ventes, pour rattacher un retour a la vente d'origine. */
export function useVenteOptions(): ApiVente[] {
  return useReferential<ApiVente>('/ventes')
}
