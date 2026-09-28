import { notFound } from 'next/navigation';
import App from '@/components/insurance-app';
export default async function Portal({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = await params;
  if (portal !== 'analis' && portal !== 'staff' && portal !== 'ojk') notFound();
  return <App key={portal} portal={portal} />;
}
