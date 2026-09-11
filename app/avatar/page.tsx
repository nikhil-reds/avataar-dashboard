'use client';

import { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { AvatarPreview } from '../../components/avatar/AvatarPreview';
import { ScriptComposer } from '../../components/avatar/ScriptComposer';
import { RenderQueue } from '../../components/avatar/RenderQueue';
import { TAB_BY_ID, INITIAL_RENDERS } from '../../data/mockData';
import { AvatarRender } from '../../types';

const VOICES = ['Hindi–English (Meera)', 'English IN (Meera)', 'Tamil (Anitha)'];

export default function AvatarStudioPage() {
  const [script, setScript] = useState<string>(
    'Namaste! Let me show you three necklaces that match your budget.'
  );
  const [voice, setVoice] = useState<string>(VOICES[0]);
  const [rendering, setRendering] = useState<boolean>(false);
  const [renderDone, setRenderDone] = useState<boolean>(false);
  const [renders, setRenders] = useState<AvatarRender[]>(INITIAL_RENDERS);

  const handleTriggerRender = () => {
    if (rendering) return;
    setRendering(true);
    setRenderDone(false);
    setTimeout(() => {
      setRendering(false);
      setRenderDone(true);
      const newRender: AvatarRender = {
        script,
        voice: voice.split(' ')[0],
        length: '0:18',
        state: 'done',
      };
      setRenders((prev) => [newRender, ...prev]);
    }, 1800);
  };

  return (
    <>
      <Header
        activeTabDef={TAB_BY_ID.avatar}
        onPrimaryClick={handleTriggerRender}
      />

      <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
          <AvatarPreview voiceLabel={voice} />

          <div className="flex flex-col gap-6">
            <ScriptComposer
              script={script}
              onChangeScript={(s) => {
                setScript(s);
                setRenderDone(false);
              }}
              voice={voice}
              onSelectVoice={setVoice}
              voices={VOICES}
              rendering={rendering}
              renderDone={renderDone}
              onRender={handleTriggerRender}
            />

            <RenderQueue renders={renders} creditNote="913 / 1000 min left" />
          </div>
        </div>
      </div>
    </>
  );
}
