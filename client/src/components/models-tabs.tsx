import { NavLink } from 'react-router-dom'
import { useI18n } from '@/i18n'

export function ModelsTabs() {
  const { t } = useI18n()
  const tab = (isActive: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${
      isActive
        ? 'bg-clay text-paper-3 dark:text-zinc-950 font-bold shadow-sh1'
        : 'text-ink-mute hover:text-ink hover:bg-ink/5'
    }`
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-ink/20 bg-paper-3 p-1">
      <NavLink to="/models/chat" className={({ isActive }) => tab(isActive)}>
        {t('nav.textModels') || t('models.chatModelsTab')}
      </NavLink>
      <NavLink to="/models/fusion" className={({ isActive }) => tab(isActive)}>
        {t('nav.ensembleComposer') || t('models.fusionTab')}
      </NavLink>
      <NavLink to="/models/embeddings" className={({ isActive }) => tab(isActive)}>
        {t('nav.vectorModels') || t('models.embeddingsTab')}
      </NavLink>
      <NavLink to="/models/image" className={({ isActive }) => tab(isActive)}>
        {t('nav.imageGeneration') || t('models.imageTab')}
      </NavLink>
      <NavLink to="/models/video" className={({ isActive }) => tab(isActive)}>
        {t('nav.videoGeneration') || t('models.videoTab')}
      </NavLink>
      <NavLink to="/models/audio" className={({ isActive }) => tab(isActive)}>
        {t('nav.voiceAudio') || t('models.audioTab')}
      </NavLink>
    </div>
  )
}
