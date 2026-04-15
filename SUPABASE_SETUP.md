# Guia de Configuração — Supabase + Claude Code + GitHub Actions

Este guia descreve como configurar a conexão com o Supabase via MCP no Claude Code e o workflow de deploy automático de migrations.

---

## Credenciais

| Item | Valor |
|------|-------|
| Supabase Project ID | `emjnqqbsmigqswbfhpzi` |
| Supabase Access Token | `sbp_ed84c308304f0c5f9219e2950fc1e9a31a4c60d6` |
| GitHub Token (scope: repo + workflow) | `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` |
| Repositório de migrations | https://github.com/pliniogiglioti/migrationsohdelivery |
| Dashboard Supabase | https://supabase.com/dashboard/project/emjnqqbsmigqswbfhpzi |

> Se algum token parar de funcionar, gere um novo em:
> - Supabase: https://supabase.com/dashboard/account/tokens
> - GitHub: https://github.com/settings/tokens (marcar **repo** + **workflow**)

---

## 1. MCP do Supabase no Claude Code

O MCP permite que o Claude Code acesse e edite o banco Supabase diretamente.

### 1.1 Criar o arquivo `.mcp.json` na raiz do projeto

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_ed84c308304f0c5f9219e2950fc1e9a31a4c60d6"
      }
    }
  }
}
```

### 1.2 Reiniciar o Claude Code

Feche e reabra o VSCode ou use `Cmd+Shift+P` > **Developer: Reload Window**.

O MCP estará ativo e o Claude poderá consultar e editar o banco diretamente.

---

## 2. Repositório Centralizado de Migrations

Todos os projetos compartilham o **mesmo banco Supabase**. Para evitar conflito, as migrations ficam em um repositório dedicado:

**Repositório:** https://github.com/pliniogiglioti/migrationsohdelivery

### Como clonar o repo de migrations

```bash
git clone https://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@github.com/pliniogiglioti/migrationsohdelivery.git
```

### Regra importante

- **Nenhum outro projeto** deve ter pasta `supabase/migrations/`
- Toda alteração no banco começa nesse repositório
- O deploy é automático via GitHub Actions ao fazer push na `main`

---

## 3. Workflow de Deploy Automático

O arquivo `.github/workflows/deploy.yml` no repositório de migrations aplica automaticamente qualquer migration nova ao fazer push na branch `main`.

```yaml
name: Deploy Migrations

on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Link project
        run: supabase link --project-ref emjnqqbsmigqswbfhpzi
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Apply migrations
        run: supabase db push --include-all
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### Secret no GitHub do repo de migrations

| Nome | Valor |
|------|-------|
| `SUPABASE_ACCESS_TOKEN` | `sbp_c9c70fc3f4d73fbdf99f226b89d1e933be40edad` |

Para adicionar: **Settings > Secrets and variables > Actions > New repository secret**

---

## 4. Como Criar uma Nova Migration

1. Abra o repositório `migrationsohdelivery` localmente
2. Crie o arquivo SQL em `supabase/migrations/` seguindo o padrão:

```
YYYYMMDDHHMMSS_descricao_da_mudanca.sql
```

Exemplo:
```
20260416120000_adiciona_coluna_status_pedido.sql
```

3. Escreva o SQL da migration:

```sql
alter table public.orders
  add column if not exists nova_coluna text;
```

4. Faça commit e push na `main`:

```bash
git add supabase/migrations/20260416120000_adiciona_coluna_status_pedido.sql
git commit -m "feat: adiciona nova_coluna em orders"
git push origin main
```

5. O GitHub Actions aplica automaticamente ao banco em segundos.

---

## 5. Boas Práticas

- **Sempre use `IF NOT EXISTS` / `IF EXISTS`** nos SQLs para evitar erro se a migration rodar mais de uma vez
- **Nunca use o mesmo timestamp** em dois arquivos de migration
- **Nunca edite migrations já aplicadas** — crie uma nova migration para corrigir

---

## 6. Referências

- Projeto Supabase: `OhDelivery` (ID: `emjnqqbsmigqswbfhpzi`)
- Repositório de migrations: https://github.com/pliniogiglioti/migrationsohdelivery
- Dashboard Supabase: https://supabase.com/dashboard/project/emjnqqbsmigqswbfhpzi
- Tokens Supabase: https://supabase.com/dashboard/account/tokens
- Tokens GitHub: https://github.com/settings/tokens
