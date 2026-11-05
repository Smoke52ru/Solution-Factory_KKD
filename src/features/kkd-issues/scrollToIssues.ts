export const ISSUES_SECTION_ID = 'kkd-issues'

/** Прокручивает страницу к таблице проблем; при `prefers-reduced-motion` — без анимации. */
export function scrollToIssues(): void {
  const section = document.getElementById(ISSUES_SECTION_ID)
  if (section === null) return
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}
