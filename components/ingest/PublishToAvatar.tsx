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
/* step 1 initialization */
