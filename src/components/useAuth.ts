import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './authContext'

/**
 * Accede au contexte d'authentification.
 *
 * Leve si le hook est utilise hors `AuthProvider` : c'est une erreur de
 * câblage, pas un etat metier, et la rendre explicite evite une lecture
 * `null` silencieuse qui aboutirait a un crash tardif et sans cause.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error("useAuth doit etre utilise a l'interieur de <AuthProvider>.")
  }
  return context
}

/** Vrai si l'utilisateur courant peut ecrire dans la metier indiquee. */
export function canWrite(role: string | undefined, metier: 'depot' | 'caisse' | 'admin'): boolean {
  // `admin` passe partout : c'est le role de supervision du depot.
  if (role === 'admin') return true
  if (metier === 'admin') return false
  return role === (metier === 'depot' ? 'magasinier' : 'caissier')
}
