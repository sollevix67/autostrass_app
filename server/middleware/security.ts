/**
 * En-tetes de securite HTTP.
 *
 * Le depot sert du HTML et du JSON ; ces en-tetes ferment les vecteurs qui
 * ne passent pas par la validation des champs :
 *
 * - `X-Content-Type-Options: nosniff` : empeche le navigateur de deviner un
 *   type MIME. Un fichier renvoye en `text/plain` ne peut plus etre execute
 *   comme du HTML si un attaquant y injecte du markup.
 * - `X-Frame-Options: DENY` + `frame-ancestors 'none'` : interdit le
 *   clickjacking. Un atelier ne peut pas-etre affiche dans une iframe tierce,
 *   ce qui permettrait de faire cliquer l'utilisateur sur des boutons places
 *   invisibles.
 * - `Referrer-Policy: strict-origin-when-cross-origin` : n'envoie le chemin
 *   courant qu'au meme site, pas a un tiers.
 * - `Permissions-Policy` : coupe les API de peripheriques non necessaires
 *   (geolocalisation, micro, camera).
 * - `Cross-Origin-Opener-Policy` : isole la fenetre des autres origines.
 *
 * **CSP volontairement omise** : elle casserait le chargement des polices
 * Google (Fira Code / Fira Sans) et le client Vite en developpement. Elle
 * doit etre definie a la creation du deploiement, quand les domaines
 * exacts sont connus — voir `securityHeaders()` et le commentaire sur
 * `VITE_USE_CDN_FONTS`.
 */

import type { NextFunction, Request, Response } from 'express'

/**
 * Applique les en-tetes de securite a toutes les reponses.
 *
 * A monter avant toute route.
 */
export function securityHeaders(_request: Request, response: Response, next: NextFunction): void {
  // Interdit toute interpretation d'un type MIME non declare.
  response.setHeader('X-Content-Type-Options', 'nosniff')
  // Aucune incorporation dans une iframe : protection contre le clickjacking.
  response.setHeader('X-Frame-Options', 'DENY')
  // Doublure CSP, comprise par les navigateurs qui ne lisent pas X-Frame-Options.
  response.setHeader('Content-Security-Policy', "frame-ancestors 'none'")
  // Reference complete uniquement vers la meme origine.
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Aucune isolation depuis les fenetres d'autres origines.
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')

  // Le depot n'utilise ni geolocalisation, ni micro, ni camera.
  response.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  // `max-age=0` : le corps d'une erreur ne doit jamais etre conserve par le
  // navigateur. Les messages d'erreur de l'API refletent l'etat de la base.
  response.setHeader('Cache-Control', 'no-store')

  // Le HSTS n'a de sens qu'en HTTPS. Le poser en local casserait le
  // rechargement sur `http://localhost`.
  if (process.env.NODE_ENV === 'production') {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  next()
}
