import { deepEqual, equal, ok } from 'node:assert/strict'
import { validateTransfertBody } from '../server/middleware/validation.js'

const valid = { source_emplacement_id: 1, emplacement_id: 2, quantite: 3 }

const withoutReference = validateTransfertBody(valid)
ok(withoutReference.ok, 'La reference dans URL suffit au transfert')
deepEqual(withoutReference.value, { ...valid, motif: null })

const alias = validateTransfertBody({ source_emplacement_id: null, destination_id: 5, quantite: 2 })
ok(alias.ok)
equal(alias.value.emplacement_id, 5)
equal(alias.value.source_emplacement_id, null)

const explicitNull = validateTransfertBody({ ...valid, emplacement_id: null, destination_id: 9 })
ok(explicitNull.ok, 'Le retour au stock non affecte prime sur un alias')
equal(explicitNull.value.emplacement_id, null)

const explicitDestination = validateTransfertBody({ ...valid, destination_id: 'invalide' })
ok(explicitDestination.ok, 'Un alias obsolete ne doit pas remplacer le champ courant')
equal(explicitDestination.value.emplacement_id, 2)

const omittedSource = validateTransfertBody({ emplacement_id: 2, quantite: 1 })
ok(omittedSource.ok)
equal(omittedSource.value.source_emplacement_id, undefined, 'L absence de source se distingue du stock non affecte')

for (const body of [null, [], 'texte', 5, undefined]) {
  const result = validateTransfertBody(body)
  ok(!result.ok)
  ok(result.errors.body)
}

for (const quantite of [undefined, null, '', '3', '3abc', '1.5', 0, -1, 0.5, 1.5, NaN, Infinity, true, 2_147_483_648]) {
  const result = validateTransfertBody({ ...valid, quantite })
  ok(!result.ok, `La quantite ${String(quantite)} doit etre refusee sans conversion ni arrondi`)
  ok(result.errors.quantite)
}

for (const key of ['emplacement_id', 'source_emplacement_id']) {
  for (const value of [undefined, '', '2', 0, -1, 1.5, NaN, Infinity, true, 4_294_967_296]) {
    const result = validateTransfertBody({ ...valid, [key]: value })
    ok(!result.ok, `${key}=${String(value)} doit etre refuse`)
    ok(result.errors[key])
  }
}

const noDestination = validateTransfertBody({ quantite: 1 })
ok(!noDestination.ok, 'Une destination manquante ne doit pas desaffecter du stock')
ok(noDestination.errors.emplacement_id)

const invalidCurrentField = validateTransfertBody({ ...valid, emplacement_id: '', destination_id: 9 })
ok(!invalidCurrentField.ok, 'Un champ courant invalide ne doit pas etre remplace par son alias')

const maximum = validateTransfertBody({ source_emplacement_id: null, emplacement_id: 4_294_967_295, quantite: 2_147_483_647 })
ok(maximum.ok, 'Les bornes correspondent aux colonnes INT MariaDB')

const motif = validateTransfertBody({ ...valid, motif: '  Reorganisation  ' })
ok(motif.ok)
equal(motif.value.motif, 'Reorganisation')
for (const value of [true, 3, {}, 'x'.repeat(256)]) {
  const result = validateTransfertBody({ ...valid, motif: value })
  ok(!result.ok)
  ok(result.errors.motif)
}

console.log('Validation des transferts de stock : OK.')
