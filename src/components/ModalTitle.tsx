
export function ModalTitle({
  title, description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-3xl text-white shadow-lg">
        ♡
      </div>

      <h2 className="mt-5 text-4xl font-black text-slate-950">{title}</h2>

      <p className="mt-3 text-lg leading-8 text-slate-600">{description}</p>
    </div>
  );
}
