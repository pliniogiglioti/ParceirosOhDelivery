-- ============================================================
-- help_articles: artigos da central de ajuda (knowledge base)
-- ============================================================
create table if not exists public.help_articles (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  summary     text not null default '',
  content     text not null default '',
  category    text not null default 'geral',
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists help_articles_slug_idx     on public.help_articles(slug);
create index if not exists help_articles_category_idx on public.help_articles(category);

-- ============================================================
-- help_comments: comentários nos artigos (aberto a todos)
-- ============================================================
create table if not exists public.help_comments (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.help_articles(id) on delete cascade,
  author_name text not null,
  author_email text,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists help_comments_article_id_idx on public.help_comments(article_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.help_articles enable row level security;
alter table public.help_comments  enable row level security;

-- Artigos publicados são públicos (leitura para todos, inclusive anônimos)
create policy "public_read_published_articles"
  on public.help_articles for select
  using (published = true);

-- Comentários: leitura pública
create policy "public_read_comments"
  on public.help_comments for select
  using (true);

-- Comentários: qualquer pessoa pode inserir (sem autenticação)
create policy "public_insert_comments"
  on public.help_comments for insert
  with check (true);

-- ============================================================
-- Trigger updated_at (reutiliza a função criada no suporte)
-- ============================================================
create trigger help_articles_set_updated_at
  before update on public.help_articles
  for each row execute function public.set_updated_at();

-- ============================================================
-- Artigos iniciais de exemplo
-- ============================================================
insert into public.help_articles (slug, title, summary, content, category) values
(
  'como-funciona-o-repasse',
  'Como funciona o repasse financeiro?',
  'Entenda como e quando o valor dos seus pedidos é transferido para sua conta.',
  E'## Como funciona o repasse\n\nO repasse é realizado semanalmente toda **segunda-feira**, referente aos pedidos entregues na semana anterior (segunda a domingo).\n\n### Valor repassado\n\nO valor líquido repassado é calculado da seguinte forma:\n\n> **Valor bruto dos pedidos** − **Taxa de 5% da plataforma** = **Valor líquido**\n\n### Como acompanhar\n\nAcesse **Financeiro** no painel do parceiro para ver o histórico de repasses, pedidos contabilizados e o próximo pagamento previsto.\n\n### Prazo de compensação\n\nApós o processamento na segunda-feira, o valor cai na conta em até **2 dias úteis**, dependendo do banco.\n\n### Dúvidas?\n\nSe identificar alguma divergência no valor, abra um chamado em **Suporte → Abrir chamado** com a categoria *Financeiro / Repasse*.',
  'financeiro'
),
(
  'como-pausar-minha-loja',
  'Como pausar ou fechar minha loja?',
  'Veja como abrir e fechar sua loja manualmente pelo painel.',
  E'## Abrindo e fechando sua loja\n\nVocê pode controlar o status da sua loja a qualquer momento diretamente pelo painel.\n\n### Pelo menu lateral\n\n1. No menu lateral, localize o card colorido com o status atual da loja (**Loja Aberta** ou **Loja fechada**).\n2. Clique nele.\n3. Confirme a ação no pop-up que aparece.\n\nO status muda imediatamente para os clientes.\n\n### Horários automáticos\n\nAlém do controle manual, você pode configurar **horários de funcionamento** em **Horários** no menu lateral. A plataforma abre e fecha a loja automaticamente nos horários definidos.\n\n### Importante\n\n- Fechar a loja manualmente **não cancela pedidos** já em andamento.\n- Pedidos recebidos antes do fechamento continuam no fluxo normal.',
  'operacao'
),
(
  'como-editar-o-cardapio',
  'Como editar produtos e categorias do cardápio?',
  'Aprenda a criar, editar e organizar seus produtos no cardápio digital.',
  E'## Gerenciando seu cardápio\n\nAcesse **Cardápio** no menu lateral para gerenciar produtos e categorias.\n\n### Criar uma categoria\n\n1. Clique em **+ Nova categoria**.\n2. Escolha o modelo (Padrão ou Pizza).\n3. Digite o nome e confirme.\n\n### Adicionar um produto\n\n1. Dentro da categoria, clique em **+ Adicionar item**.\n2. Escolha o tipo: **Industrializado** (produto pronto, com EAN) ou **Preparado** (feito na cozinha).\n3. Preencha nome, descrição, preço e foto.\n4. Salve.\n\n### Ativar / desativar produtos\n\nUse o toggle ao lado de cada produto para ativá-lo ou desativá-lo sem excluir.\n\n### Reordenar categorias\n\nClique em **Ordenar categorias** (ícone de setas) para arrastar e soltar na ordem desejada.',
  'cardapio'
),
(
  'prazo-para-receber-pedidos',
  'Quando começo a receber pedidos?',
  'Saiba o que acontece após o cadastro ser aprovado e quando os primeiros pedidos chegam.',
  E'## Após a aprovação do cadastro\n\nAssim que seu cadastro for **aprovado**, você receberá um email de confirmação.\n\n### Checklist para começar a receber\n\n- [ ] Assinar o contrato digital\n- [ ] Completar o primeiro acesso (horários, formas de pagamento, área de entrega)\n- [ ] Ter pelo menos **1 produto ativo** no cardápio\n- [ ] **Abrir a loja** manualmente pelo painel\n\n### Primeiros pedidos\n\nApós abrir a loja, seu estabelecimento já aparece para clientes da sua região de entrega. O tempo para o primeiro pedido varia conforme a demanda da sua área.\n\n### Visibilidade\n\nLojas com foto de capa, logotipo, boa descrição e cardápio completo têm **mais destaque** na plataforma.',
  'operacao'
)
on conflict (slug) do nothing;
