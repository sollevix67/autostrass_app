import { useState } from 'react'
import { PageLayout } from '../../components/PageLayout'
import { Icon } from '../../components/Icon'
import { useRemoteValue } from '../../hooks/useRemoteValue'
import type { ApiParametres } from '../../services/contracts'
import { pdfLogoSource } from '../../utils/pdfLogo'
import DocumentsPdfForm from './DocumentsPdfForm'

export default function DocumentsPdfView() {
  const { data, loading, error, reload, setData } = useRemoteValue<ApiParametres>('/parametres')
  const [editing, setEditing] = useState(false)
  const settings = data?.documentsPdf
  return <PageLayout eyebrow="PARAMÈTRES" title="Documents PDF" description="Personnaliser l’en-tête, le logo et le pied de page communs aux documents."
    actions={<button type="button" className="secondary-button" onClick={reload} disabled={loading || editing}>Actualiser</button>}>
    {loading ? <p role="status">Chargement des paramètres…</p> : error ? <p className="error-banner" role="alert">{error}</p> : settings ? <>
      <section className="panel parametre-detail documents-pdf-summary">
        <h2>Présentation enregistrée</h2>
        <dl className="parametre-facts">
          <div><dt>Nom de l’émetteur</dt><dd>{settings.nomEmetteur}</dd></div>
          <div><dt>Activité</dt><dd>{settings.activite || 'Non renseignée'}</dd></div>
          <div><dt>Coordonnées et mentions</dt><dd className="documents-pdf-multiline">{settings.coordonnees || 'Non renseignées'}</dd></div>
          <div><dt>Pied de page commun</dt><dd className="documents-pdf-multiline">{settings.piedCommun || 'Aucun texte commun'}</dd></div>
          <div><dt>Logo</dt><dd>{settings.logo ? <img className="documents-pdf-saved-logo" src={pdfLogoSource(settings.logo)} alt="Logo enregistré pour les PDF" /> : 'Aucun logo'}</dd></div>
        </dl>
        <button type="button" className="primary-button" aria-haspopup="dialog" onClick={() => setEditing(true)}><Icon name="edit" size="sm" /> Modifier les documents</button>
      </section>
      {editing && <DocumentsPdfForm values={settings} onSaved={setData} onClose={() => setEditing(false)} />}
    </> : <p className="error-banner" role="alert">La configuration PDF n’est pas disponible. Actualisez les paramètres.</p>}
  </PageLayout>
}
