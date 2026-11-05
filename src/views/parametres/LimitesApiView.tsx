import ConfigurationView from './ConfigurationView'

export default function LimitesApiView() {
  return <ConfigurationView section="api" title="Limites de requêtes API" description="Régler les quotas par adresse IP pour les services de l’application." />
}
