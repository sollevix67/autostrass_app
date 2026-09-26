/**
 * Chargement des referentiels utilises par les `<select>` des documents.
 *
 * Quatre vues ont besoin des memes listes de reference pour construire un
 * select lisible : le nom du client sur une commande, le numero d'une commande
 * sur une livraison, la vente concernee par un retour, le client d'une vente.
 *
 * Ces listes ne sont pas dupliquees dans chaque vue : le select est reconstruit
 * a chaque rendu, donc quatre `fetch` independants aboutiraient a quatre
 * appels identiques par session. Elles sont mises en cache ici pour la duree du
 * module, avec une seule requete concurrente par chemin.
 *
 * Le select ne lit que l'identifiant : un echec de chargement ne doit pas
 * empecher de saisir la vente elle-meme, seulement la selection rattachee. Le
 * hook n'expose donc volontairement pas d'etat d'erreur.
 */

import { useEffect, useState } from 'react'
import { api, isAbortError } from '../services/api'
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
function fetchOnce(path: string, signal?: AbortSignal): Promise<unknown[]> {
  const existing = cache.get(path)
  if (existing?.promise) return existing.promise

  const promise = api
    .get<unknown[]>(path, { signal })
    .then((data) => (Array.isArray(data) ? data : []))
    .catch((cause: unknown) => {
      if (isAbortError(cause)) return []
      // Un referentiel absent ne doit pas casser la vue : on renvoie une liste
      // vide et l'utilisateur saisira le reste du document.
      return []
    })
    .then((data) => {
      const entry = cache.get(path)
      // La reference ne doit changer que si `invalidate` a ete appele entre-temps.
      if (entry?.promise === promise) cache.set(path, { data, promise: null })
      return data
    })

  cache.set(path, { data: null, promise })
  return promise
}

/** Vide le cache : appele apres une ecriture pour recharger les listes. */
export function invalidateReferentials(paths?: string[]): void {
  if (paths === undefined) {
    cache.clear()
    return
  }
  for (const path of paths) cache.delete(path)
}

/**
 * Charge un referentiel et le rend au composant, avec annulation au demontage.
 *
 * L'etat ne contient que la reponse du reseau. Le cache est relu pendant le
 * rendu, pas dans l'effet : y ecrire declencherait un second rendu en cascade
 * (regle `react(set-state-in-effect)`), alors que la lecture est pure.
 */
function useReferential<T>(path: string): T[] {
  const [fetched, setFetched] = useState<{ path: string; rows: T[] } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    void fetchOnce(path, controller.signal).then((data) => {
      if (active) setFetched({ path, rows: data as T[] })
    })

    return () => {
      active = false
      controller.abort()
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
