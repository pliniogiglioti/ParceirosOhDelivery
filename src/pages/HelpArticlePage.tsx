import { ArrowLeft, MessageSquare, Send, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  createHelpComment,
  fetchArticleComments,
  fetchHelpArticleBySlug,
  type HelpArticle,
  type HelpComment,
} from '@/services/help'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h2 class="mt-8 mb-3 text-xl font-bold text-ink-900">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="mt-6 mb-2 text-base font-bold text-ink-800">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^> (.+)$/gm, '<blockquote class="my-4 border-l-4 border-coral-300 pl-4 text-ink-600 italic">$1</blockquote>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="flex items-center gap-2 text-sm text-ink-700"><span class="text-green-500">✓</span> $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex items-center gap-2 text-sm text-ink-400"><span>○</span> $1</li>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-ink-700">$1</li>')
    .replace(/\n\n/g, '</p><p class="mt-3 text-sm leading-7 text-ink-700">')
    .replace(/^(?!<)(.+)$/gm, '<p class="mt-3 text-sm leading-7 text-ink-700">$1</p>')
}

function CommentForm({ articleId, onAdded }: { articleId: string; onAdded: (c: HelpComment) => void }) {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !content.trim()) return
    setSubmitting(true)
    try {
      const comment = await createHelpComment({ articleId, authorName: name, content })
      onAdded(comment)
      setContent('')
      toast.success('Comentário enviado!')
    } catch {
      toast.error('Não foi possível enviar o comentário.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Deixe um comentário</p>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Seu nome"
        className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-coral-300 transition"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder="Escreva sua dúvida ou contribuição..."
        className="w-full resize-none rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-coral-300 transition"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!name.trim() || !content.trim() || submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </form>
  )
}

export function HelpArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<HelpArticle | null | 'loading'>('loading')
  const [comments, setComments] = useState<HelpComment[]>([])

  useEffect(() => {
    if (!slug) return
    void fetchHelpArticleBySlug(slug).then((result) => {
      setArticle(result)
      if (result) {
        void fetchArticleComments(result.id).then(setComments)
      }
    })
  }, [slug])

  if (article === 'loading') {
    return (
      <div className="min-h-dvh bg-[#f7f7f7]">
        <header className="bg-white border-b border-ink-100">
          <div className="mx-auto max-w-3xl px-6 py-6">
            <div className="h-8 w-32 animate-pulse rounded-xl bg-ink-100" />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-12 space-y-4">
          <div className="h-8 w-3/4 animate-pulse rounded-xl bg-white" />
          <div className="h-4 w-1/2 animate-pulse rounded-xl bg-white" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded-xl bg-white" style={{ width: `${75 + (i % 3) * 10}%` }} />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (!article) return <Navigate to="/ajuda" replace />

  return (
    <div className="min-h-dvh bg-[#f7f7f7]">
      {/* Header */}
      <header className="bg-white border-b border-ink-100">
        <div className="mx-auto max-w-3xl px-6 py-6 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <img src="/logo.png" alt="Oh Delivery" className="h-8 w-auto object-contain" />
          </Link>
          <Link
            to="/login"
            className="rounded-xl bg-coral-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral-600"
          >
            Acessar painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Back */}
        <Link
          to="/ajuda"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition hover:text-coral-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Central de Ajuda
        </Link>

        {/* Article */}
        <article className="mt-6 rounded-2xl border border-ink-100 bg-white p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">{article.category}</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink-900">{article.title}</h1>
          <p className="mt-1 text-sm text-ink-400">Publicado em {formatDate(article.createdAt)}</p>

          <div
            className="mt-8 leading-7 text-ink-700"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
          />
        </article>

        {/* Comments */}
        <section className="mt-8 rounded-2xl border border-ink-100 bg-white p-8">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-ink-400" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              {comments.length} {comments.length === 1 ? 'comentário' : 'comentários'}
            </p>
          </div>

          {comments.length > 0 && (
            <div className="mt-5 space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500">
                    <User className="h-4 w-4" />
                  </span>
                  <div className="flex-1 rounded-xl bg-ink-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink-900">{comment.authorName}</p>
                      <p className="text-xs text-ink-400">{formatDate(comment.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-ink-700">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <CommentForm articleId={article.id} onAdded={(c) => setComments((prev) => [...prev, c])} />
        </section>
      </main>

      <footer className="border-t border-ink-100 bg-white py-6 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} Oh Delivery · Todos os direitos reservados
      </footer>
    </div>
  )
}
