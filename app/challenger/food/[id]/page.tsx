export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main style={{ padding: 20 }}>
      <h1>Food details page works</h1>
      <p>ID: {id}</p>
    </main>
  );
}