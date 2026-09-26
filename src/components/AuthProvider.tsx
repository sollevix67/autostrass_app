/**
 * Provider d'authentification.
 *
 * Au chargement, la session est tentée via `GET /api/auth/me` : le cookie
 * `httpOnly` posé a la connexion suffit, donc un rechargement de page ne
 * deconnecte pas. Tant que cette verification est en cours, l'interface
 * affiche un etat « verification », pas un ecran de connexion : sans cela
 * l'utilisateur verrait clignoter le formulaire a chaque rechargement.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setSessionToken, setCsrfToken, toErrorMessage, isAbortError } from '../services/api'
import { AuthContext, type SessionUser, type AuthStatus } from './authContext'
import type { LoginResponse, MeResponse } from '../services/contracts'

/** Message dedie aux echecs d'authentification ; les autres erreurs restent brutes. */
function toAuthError(error: unknown): string {
  const message = toErrorMessage(error)
  return message === "L'element demande est introuvable." ? 'Session expiree. Reconnectez-vous.' : message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [error, setError] = useState<string | null>(null)

  // Restauration de session au montage. L'annulation evite de mettre a jour
  // l'etat sur un composant deja demonte (React 19 signale l'ecriture).
  useEffect(() => {
    const controller = new AbortController()

    api
      .get<MeResponse>('/auth/me', { signal: controller.signal })
      .then((response) => {
        setUser(response.user)
        // Le serveur renouvelle le jeton CSRF a chaque `/me` : on le prend.
        setCsrfToken(response.csrfToken)
        setStatus('authenticated')
        setError(null)
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) return
        // 401 attendu au premier lancement : ce n'est pas une panne.
        setUser(null)
        setStatus('anonymous')
        setError(null)
      })

    return () => controller.abort()
  }, [])

  const signIn = useCallback(async (email: string, motDePasse: string): Promise<boolean> => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, motDePasse })
      // Le serveur pose aussi un cookie httpOnly ; on garde le jeton en
      // memoire pour ne pas dependre d'un stockage persistant lisible.
      setSessionToken(response.token)
      setCsrfToken(response.csrfToken)
      setUser(response.user)
      setStatus('authenticated')
      setError(null)
      return true
    } catch (cause) {
      setError(toAuthError(cause))
      return false
    }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } catch {
      // La deconnexion locale doit aboutir meme si l'appel echoue : l'API est
      // peut-etre deja arretee, et l'utilisateur veut justement sortir.
    }
    setSessionToken(null)
    setCsrfToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<MeResponse>('/auth/me')
      setUser(response.user)
    } catch {
      // Un echec ici n'invalide pas la session en cours : on ne fait rien.
    }
  }, [])

  const value = useMemo(
    () => ({ user, status, error, signIn, signOut, refreshUser }),
    [user, status, error, signIn, signOut, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
