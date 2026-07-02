
export function ModalTitle({
  title, description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8 text-center">
      <img src="/logo.svg" alt="담소" className="mx-auto h-16 w-16 rounded-3xl shadow-lg" />

      <h2 className="mt-5 text-4xl font-black text-slate-950">{title}</h2>

      <p className="mt-3 text-lg leading-8 text-slate-600">{description}</p>
    </div>
  );
}
