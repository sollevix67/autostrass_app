import { X509Certificate, createPrivateKey } from 'node:crypto'
import { createSecureContext } from 'node:tls'
import type { HttpsSettings } from '../../src/schemas/parametres.js'
import { getSettings, startupSettings, settingsError } from './settingsStore.js'

export function validateCertificate(settings: HttpsSettings) {
  if (!settings.certificatePem || !settings.privateKeyPem) throw settingsError('Fournissez le certificat et sa clé privée.')
  try {
    const certificate = new X509Certificate(settings.certificatePem)
    if (!certificate.checkPrivateKey(createPrivateKey(settings.privateKeyPem))) throw new Error()
    if (Date.parse(certificate.validFrom) > Date.now() || Date.parse(certificate.validTo) <= Date.now()) throw new Error()
    createSecureContext({ cert: settings.certificatePem, key: settings.privateKeyPem, minVersion: 'TLSv1.2' })
    return { subject: certificate.subject, issuer: certificate.issuer, validFrom: certificate.validFrom, validTo: certificate.validTo, fingerprint: certificate.fingerprint256 }
  } catch { throw settingsError('Certificat invalide, expiré ou incompatible avec la clé privée.') }
}

export function publicHttpsSettings() {
  const settings = getSettings().https
  let certificate = null
  if (settings.certificatePem) {
    try {
      const parsed = new X509Certificate(settings.certificatePem)
      certificate = { subject: parsed.subject, issuer: parsed.issuer, validFrom: parsed.validFrom, validTo: parsed.validTo, fingerprint: parsed.fingerprint256 }
    } catch { /* L'état reste visible même si un certificat historique est invalide. */ }
  }
  return { enabled: settings.enabled, port: settings.port, httpMode: settings.httpMode, publicOrigin: settings.publicOrigin, certificate,
    privateKeyConfigured: Boolean(settings.privateKeyPem), active: startupSettings.https.enabled,
    restartRequired: JSON.stringify(settings) !== JSON.stringify(startupSettings.https) }
}
