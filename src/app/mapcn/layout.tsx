// Force dynamic rendering for this page to avoid SSR issues with maplibre-gl
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function MapCnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

