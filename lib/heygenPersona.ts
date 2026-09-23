import type { PublishedPersona } from './publishedPersona';

// LiveAvatar limits each dynamic variable to 1,000 characters. Keep all text,
// including empty trailing parts so the hosted context has a stable variable set.
export function heygenPersonaVariables(settings: Pick<PublishedPersona, 'openingIntro' | 'persona' | 'instructions'>) {
  return {
    opening_intro: settings.openingIntro,
/* step 2 initialization */
