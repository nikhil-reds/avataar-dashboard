import type { Metadata } from 'next';

import { PersonaEditor } from '@/components/persona/PersonaEditor';
import { TAB_BY_ID, tabMetadata } from '@/data/navigation';
import { getPersonaSettings } from '@/lib/persona';

export const metadata: Metadata = tabMetadata('persona');
export const dynamic = 'force-dynamic';

export default async function PersonaPage() {
  const settings = await getPersonaSettings();

  return <PersonaEditor initialSettings={settings} tab={TAB_BY_ID.persona} />;
}
