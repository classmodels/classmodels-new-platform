export default function ModelAnalyseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Modellenanalyses</h1>
        <p className="mt-1 text-sm text-muted">Sleutels, begonnen dossiers en betaalde analyses.</p>
      </div>
      {children}
    </div>
  );
}
