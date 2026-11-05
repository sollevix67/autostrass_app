import { useRef, useState } from 'react'
import { DataTable, type ColumnDef } from '../../components/DataTable'
import { FormInput } from '../../components/forms/FormFields'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useConfirm } from '../../components/useConfirm'
import { useToast } from '../../components/useToast'
import { useRemoteValue } from '../../hooks/useRemoteValue'
import { api, toErrorMessage } from '../../services/api'
import { referentielSchema, categorieUpdateSchema, sousCategorieSchema, type Referentiel, type SousCategorie } from '../../schemas/parametres'

type Item = Referentiel & { categorieId?: number }
const empty = { code: '', libelle: '', actif: true, categorieId: 0 }

export default function ReferentielEditor({ path, title, parents, onChange }: { path: 'categories' | 'sous-categories' | 'secteurs'; title: string; parents?: Referentiel[]; onChange?: () => void }) {
  const { data, loading, error: loadError, reload } = useRemoteValue<Item[]>(`/${path}`)
  const [values, setValues] = useState(empty)
  const [editing, setEditing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const { dialogProps, confirm } = useConfirm()
  const toast = useToast()
  async function save() {
    if (pending.current || loading || loadError) return
    const schema = path === 'sous-categories' ? sousCategorieSchema : path === 'categories' && editing ? categorieUpdateSchema : referentielSchema
    const parsed = schema.safeParse(values)
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join(' ')); return }
    pending.current = true; setBusy(true); setError(null)
    try {
      if (editing) await api.put(`/${path}/${editing}`, parsed.data)
      else await api.post(`/${path}`, parsed.data)
      setEditing(null); setValues(empty); reload(); onChange?.(); toast.success('Enregistrement effectué.')
    } catch (cause) { setError(toErrorMessage(cause)) }
    finally { pending.current = false; setBusy(false) }
  }
  async function remove(item: Item) {
    if (pending.current) return
    pending.current = true; setBusy(true); setError(null)
    try {
      await api.delete(`/${path}/${item.id}`)
      if (editing === item.id) { setEditing(null); setValues(empty) }
      reload(); onChange?.(); toast.success('Élément supprimé.')
    } catch (cause) { setError(toErrorMessage(cause)) }
    finally { pending.current = false; setBusy(false) }
  }
  const columns: ColumnDef<Item>[] = [
    { key: 'code', header: 'CODE', sortable: true, sortValue: (row) => row.code, render: (row) => row.code },
    { key: 'libelle', header: 'LIBELLÉ', sortable: true, sortValue: (row) => row.libelle, render: (row) => row.libelle },
    ...(parents ? [{ key: 'parent', header: 'CATÉGORIE', render: (row: Item) => parents.find((parent) => parent.id === row.categorieId)?.libelle ?? '—' }] : []),
    { key: 'actif', header: 'ÉTAT', render: (row) => <span className={`status-badge ${row.actif ? 'status-disponible' : ''}`}>{row.actif ? 'Actif' : 'Inactif'}</span> },
    { key: 'actions', header: 'ACTIONS', render: (row) => <div className="actions-cell">
      <button type="button" className="link-button" disabled={busy} aria-label={`Modifier ${row.libelle}`} onClick={() => { setEditing(row.id); setValues({ ...row, categorieId: (row as SousCategorie).categorieId ?? 0 }); setError(null); document.getElementById(`${path}-libelle`)?.focus() }}>Modifier</button>
      <button type="button" className="link-button" disabled={busy} aria-label={`Supprimer ${row.libelle}`} onClick={() => confirm(`Supprimer ${row.libelle} ?`, 'La suppression sera refusée si cet élément est encore utilisé. Vous pouvez le désactiver pour le conserver.', () => void remove(row))}>Supprimer</button>
    </div> },
  ]
  return (
    <section className="panel parametre-editor">
      <div className="panel-heading"><h2>{title}</h2><button type="button" className="secondary-button" onClick={reload} disabled={loading || busy}>Actualiser</button></div>
      {loadError && <p className="error-banner" role="alert">{loadError}</p>}
      <DataTable rows={data ?? []} columns={columns} rowKey={(row) => String(row.id)} loading={loading} caption={title} emptyMessage="Aucun élément enregistré." />
      <form className="parametre-detail" onSubmit={(event) => { event.preventDefault(); void save() }}>
        <h3>{editing ? 'Modifier l’élément' : 'Ajouter un élément'}</h3>
        {error && <p className="error-banner" role="alert">{error}</p>}
        <fieldset className="parametre-fieldset" disabled={busy || loading || Boolean(loadError)}>
          <fieldset className="parametre-fieldset" disabled={editing !== null}>
            <FormInput name={`${path}-code`} label="Code" value={values.code} onChange={(_, code) => setValues({ ...values, code })} required hint="Le code reste stable après création." />
            {parents && <div className="form-group"><label htmlFor={`${path}-parent`}>Catégorie</label><select id={`${path}-parent`} value={values.categorieId || ''} onChange={(event) => setValues({ ...values, categorieId: Number(event.target.value) })} required><option value="">Choisir une catégorie</option>{parents.filter((parent) => parent.actif || parent.id === values.categorieId).map((parent) => <option key={parent.id} value={parent.id}>{parent.libelle}{!parent.actif ? ' (inactive)' : ''}</option>)}</select></div>}
          </fieldset>
          <FormInput name={`${path}-libelle`} label="Libellé" value={values.libelle} onChange={(_, libelle) => setValues({ ...values, libelle })} required />
          <label className="parametre-checkbox"><input type="checkbox" checked={values.actif} onChange={(event) => setValues({ ...values, actif: event.target.checked })} />Actif</label>
          <div className="form-actions"><button type="submit" className="primary-button">{busy ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter'}</button>{editing && <button type="button" className="secondary-button" onClick={() => { setEditing(null); setValues(empty); setError(null) }}>Annuler</button>}</div>
        </fieldset>
      </form>
      <ConfirmDialog {...dialogProps} />
    </section>
  )
}
