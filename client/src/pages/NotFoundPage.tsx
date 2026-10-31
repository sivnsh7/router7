import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { ClayButton } from '@/components/ui/clay-button'
import { useI18n } from '@/i18n'
import { RaisedCard } from '@/components/ui/clay-card'

export default function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="flex justify-center py-16">
      <RaisedCard className="w-full max-w-md p-8 text-center">
        <Compass className="mx-auto size-8 text-ink-mute" />
        <h1 className="mt-4 text-lg font-semibold text-ink">{t('notFound.title')}</h1>
        <p className="mt-1 text-sm text-ink-mute">{t('notFound.description')}</p>
        <div className="mt-5">
          <Link to="/">
            <ClayButton size="sm">{t('errors.goHome')}</ClayButton>
          </Link>
        </div>
      </RaisedCard>
    </div>
  )
}
