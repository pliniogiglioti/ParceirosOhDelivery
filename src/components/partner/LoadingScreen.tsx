export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="panel-card max-w-md p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coral-500">Parceiro Oh</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink-900">Preparando dashboard</h1>
        <p className="mt-3 text-sm leading-6 text-ink-500">
          Carregando a base visual, o menu lateral e os dados do parceiro.
        </p>
      </div>
    </div>
  )
}
