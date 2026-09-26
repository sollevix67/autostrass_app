/**
 * Contexte d'authentification.
 *
 * Separé de `useAuth.ts` (le hook) : un fichier `.tsx` qui exporte a la fois
 * des composants et des hooks casse le fast refresh (regle oxlint
 * `react/only-export-components`).
 */

import { createContext } from 'react'
import type { UserRole } from '../types'

/** Utilisateur connecte, tel que renvoye par l'API. */
export type SessionUser = {
  id: number
  email: string
  role: UserRole
  nom: string
  prenom: string
}

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

export type AuthContextValue = {
  user: SessionUser | null
  status: AuthStatus
  /** Message d'erreur de la derniere tentative de connexion. */
  error: string | null
  signIn: (email: string, motDePasse: string) => Promise<boolean>
  signOut: () => Promise<void>
  /** Remplace l'utilisateur courant apres une modification de son compte. */
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
