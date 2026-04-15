-- Habilita Realtime para as tabelas de chat e avaliações
-- Necessário para que o frontend receba atualizações em tempo real

-- Adiciona chat_messages à publicação do Realtime
alter publication supabase_realtime add table public.chat_messages;

-- Adiciona chat_sessions à publicação do Realtime
alter publication supabase_realtime add table public.chat_sessions;

-- Adiciona store_reviews à publicação do Realtime (para badge de novas avaliações)
alter publication supabase_realtime add table public.store_reviews;
