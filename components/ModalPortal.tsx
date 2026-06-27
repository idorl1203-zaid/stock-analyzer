'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders modal content into document.body so overlays escape the
 * `.main-content` stacking context (which sits below the fixed sidebar,
 * z-index:100). Without this, the sidebar paints over the modal edge and
 * crops it on mobile. Mounted-guarded to stay SSR/hydration-safe.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
