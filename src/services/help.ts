import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export interface HelpArticle {
  id: string
  slug: string
  title: string
  summary: string
  content: string
  category: string
  createdAt: string
}

export interface HelpComment {
  id: string
  articleId: string
  authorName: string
  content: string
  createdAt: string
}

function mapArticle(row: Record<string, unknown>): HelpArticle {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary: String(row.summary ?? ''),
    content: String(row.content ?? ''),
    category: String(row.category ?? 'geral'),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}

function mapComment(row: Record<string, unknown>): HelpComment {
  return {
    id: String(row.id),
    articleId: String(row.article_id),
    authorName: String(row.author_name ?? 'Anônimo'),
    content: String(row.content ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}

export async function fetchHelpArticles(): Promise<HelpArticle[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('help_articles')
    .select('id, slug, title, summary, category, created_at')
    .eq('published', true)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => mapArticle(row as Record<string, unknown>))
}

export async function fetchHelpArticleBySlug(slug: string): Promise<HelpArticle | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const { data, error } = await supabase
    .from('help_articles')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (error) return null
  return mapArticle(data as Record<string, unknown>)
}

export async function fetchArticleComments(articleId: string): Promise<HelpComment[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('help_comments')
    .select('*')
    .eq('article_id', articleId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => mapComment(row as Record<string, unknown>))
}

export async function createHelpComment(input: {
  articleId: string
  authorName: string
  authorEmail?: string
  content: string
}): Promise<HelpComment> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { data, error } = await supabase
    .from('help_comments')
    .insert({
      article_id: input.articleId,
      author_name: input.authorName.trim(),
      author_email: input.authorEmail?.trim() || null,
      content: input.content.trim(),
    })
    .select('*')
    .single()

  if (error) throw error
  return mapComment(data as Record<string, unknown>)
}
