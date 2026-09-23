import type { PublishedPersona } from './publishedPersona';

// LiveAvatar limits each dynamic variable to 1,000 characters. Keep all text,
// including empty trailing parts so the hosted context has a stable variable set.
export function heygenPersonaVariables(settings: Pick<PublishedPersona, 'openingIntro' | 'persona' | 'instructions'>) {
  return {
    opening_intro: settings.openingIntro,
    persona_1: settings.persona.slice(0, 1000),
    persona_2: settings.persona.slice(1000),
    instructions_1: settings.instructions.slice(0, 1000),
/* step 3 initialization */
