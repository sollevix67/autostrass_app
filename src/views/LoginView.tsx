/**
 * Ecran de connexion.
 *
 * Le formulaire est volontairement minimal : un depot compte peu d'utilisateurs
 * et la liste des comptes de demonstration est rappelee en bas d'ecran, ce qui
 * evite qu'un developpeur bloque sur l'ecran au premier lancement.
 *
 * L'acces au depot sans session renverrait 401 sur toutes les routes metier :
 * le message le dit explicitement plutot que d'afficher une page vide.
 */

import { useState, type FormEvent } from 'react'
import { useAuth } from '../components/useAuth'
import { Icon } from '../components/Icon'
import { ErrorSummary } from '../components/forms/ErrorSummary'
import { z } from 'zod'

/** Validation locale, en miroir de `loginBodySchema` cote serveur. */
const loginSchema = z.object({
  email: z.string().trim().min(1, "L'email est requis.").email("Format d'email invalide."),
  motDePasse: z.string().min(1, 'Le mot de passe est requis.'),
})

type FieldErrors = Partial<Record<'email' | 'motDePasse', string>>

/** Comptes de demonstration, cf. database/seed_v2.sql. */
const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'marie.laurent@autostrass.fr' },
  { role: 'Magasinier', email: 'karim.moreau@autostrass.fr' },
  { role: 'Caissier', email: 'sophie.bernard@autostrass.fr' },
] as const

export function LoginView() {
  const { signIn, error } = useAuth()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = loginSchema.safeParse({ email, motDePasse })
    if (!parsed.success) {
      const errors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors
        if (!(key in errors)) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setSubmitting(true)
    await signIn(parsed.data.email, parsed.data.motDePasse)
    setSubmitting(false)
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-mark">A</span>
          <span>AUTOSTRASS</span>
        </div>

        <h1>Connexion au depot</h1>
        <p className="heading-copy">
          L'acces au stock, aux ventes et aux clients est reserve aux utilisateurs enregistres.
        </p>

        {Object.keys(fieldErrors).length > 0 && (
          <ErrorSummary
            errors={fieldErrors}
            labels={{ email: 'Adresse email', motDePasse: 'Mot de passe' }}
            order={['email', 'motDePasse']}
          />
        )}

        {error !== null && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={fieldErrors.email ? 'true' : undefined}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <span className="form-error-text" id="email-error" role="alert">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="motDePasse">Mot de passe</label>
            <input
              id="motDePasse"
              name="motDePasse"
              type="password"
              autoComplete="current-password"
              value={motDePasse}
              onChange={(event) => setMotDePasse(event.target.value)}
              aria-invalid={fieldErrors.motDePasse ? 'true' : undefined}
              aria-describedby={fieldErrors.motDePasse ? 'motDePasse-error' : undefined}
            />
            {fieldErrors.motDePasse && (
              <span className="form-error-text" id="motDePasse-error" role="alert">
                {fieldErrors.motDePasse}
              </span>
            )}
          </div>

          <button type="submit" className="primary-button login-submit" disabled={submitting}>
            {submitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="login-demo">
          <p>
            <Icon name="alert" size="sm" /> Comptes de demonstration — mot de passe{' '}
            <code>demo1234</code>
          </p>
          <ul>
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(account.email)
                    setMotDePasse('demo1234')
                  }}
                >
                  <b>{account.role}</b>
                  <span>{account.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}
