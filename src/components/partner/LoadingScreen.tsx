export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="panel-card max-w-md p-8 text-center">
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <div className="absolute h-24 w-24 rounded-full bg-coral-500/10 animate-ping" />
          <div className="absolute h-20 w-20 rounded-full border border-coral-500/20 bg-coral-500/5" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-[22px] bg-coral-500 shadow-[0_18px_40px_rgba(255,54,0,0.22)]">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-white" />
              <span
                className="h-2.5 w-2.5 animate-bounce rounded-full bg-white"
                style={{ animationDelay: '0.15s' }}
              />
              <span
                className="h-2.5 w-2.5 animate-bounce rounded-full bg-white"
                style={{ animationDelay: '0.3s' }}
              />
            </div>
          </div>
        </div>

        <h1 className="mt-6 font-display text-3xl font-bold text-ink-900">Carregando...</h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          Estamos preparando seus dados e sincronizando as informacoes da loja.
        </p>

        <div className="mt-6 overflow-hidden rounded-full bg-[#f4d7da]">
          <div className="h-2 w-2/3 animate-pulse rounded-full bg-coral-500" />
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral-500" />
          Aguarde alguns instantes
        </div>
      </div>
    </div>
  )
}
