export default function CommunicatieLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Communicatie</h1>
        <p className="mt-1 text-sm text-muted">Bulk e-mail en SMS naar modellen, lijsten of losse contacten.</p>
      </div>
      {children}
    </div>
  );
}
