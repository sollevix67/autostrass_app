import { PageLayout } from '../../components/PageLayout'
import { EmplacementsManager } from '../../components/EmplacementsManager'
import { useEmplacements } from '../../hooks/useEmplacements'

export default function EmplacementsView() {
  const state = useEmplacements()
  return <PageLayout eyebrow="PARAMÈTRES" title="Emplacements de stockage" description="Administrer les allées, étagères et places du dépôt.">
    <EmplacementsManager {...state} />
  </PageLayout>
}
