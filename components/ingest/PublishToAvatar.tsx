'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, UploadCloud, X } from 'lucide-react';

export function PublishToAvatar({ disabled = false }: { disabled?: boolean }) {
  const pathname = usePathname();
  const [status, setStatus] = useState('Checking saved changes…');
  useEffect(() => {
    let active = true;
    let checking = false;
    const check = async () => {
      if (checking || document.visibilityState === 'hidden') return;
      checking = true;
      try {
        const response = await fetch('/api/persona/publish', { cache: 'no-store' });
        if (!response.ok) throw new Error('Status unavailable');
        const data = await response.json();
        if (active) setStatus(data.hasChanges ? 'Saved changes to publish' : 'All saved changes published');
      } catch { if (active) setStatus('Publication status unavailable'); }
      finally { checking = false; }
    };
    void check();
    const timer = window.setInterval(check, 15000);
    window.addEventListener('focus', check);
    window.addEventListener('avatar-publication-changed', check);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', check); window.removeEventListener('avatar-publication-changed', check); };
  }, [pathname]);
  const inFlight = useRef(false);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null);

  async function publish() {
    if (disabled || inFlight.current) return;
    inFlight.current = true;
    setPublishing(true);
    setNotice(null);
    try {
      const response = await fetch('/api/persona/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useSaved: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Publishing failed. Please retry.');
      window.dispatchEvent(new Event('avatar-publication-changed'));
      const excluded = data.published.excludedSources?.length ?? 0;
      setNotice({ failed: false, text: `Your saved persona, opening intro, instructions, ${data.published.sourceCount} sources and ${data.published.catalogueCount ?? 0} catalogue items are now synced to Redis and HeyGen. Reconnect the avatar to use this version.${excluded ? ` ${excluded} sources excluded because extraction is required or ingest failed. See Persona for details.` : ''}` });
    } catch (error) {
      setNotice({ failed: true, text: error instanceof Error ? error.message : 'Publishing failed. Please retry.' });
    } finally {
      inFlight.current = false;
      setPublishing(false);
    }
  }

  return <>
    <div className="flex flex-col gap-1">
    <button type="button" onClick={publish} disabled={disabled || publishing} aria-busy={publishing}
/* step 4 initialization */
