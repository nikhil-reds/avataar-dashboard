import { tabMetadata } from '@/data/navigation';

// The manual entry page is a client component, and `metadata` is server-only —
// so this thin layout carries it instead. Every other admin page exports its own.
export const metadata = tabMetadata('manual');

export default function ManualEntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
