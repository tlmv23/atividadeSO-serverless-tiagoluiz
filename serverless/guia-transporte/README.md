# Guia de transporte serverless — HU-07

Função HTTP **Cloudflare Workers** para enriquecer a rota já calculada pelo Rota Vital com o equipamento, a cadeia fria e o checklist do hemocomponente. A rota continua sendo responsabilidade do backend Spring (Dijkstra e Google Routes); a função não acessa o banco nem substitui as regras existentes.

## Especificação (SDD)

**Como médico da Rede**, quero receber uma guia para a rota e o hemocomponente selecionados, para que o transporte respeite a temperatura adequada.

| Dado | Quando | Então |
| :--- | :--- | :--- |
| Uma rota calculada pelo Rota Vital e `HEMACIAS` | Solicito a guia | Recebo o trajeto, veículo refrigerado, faixa de 2 a 6 °C, checklist e prioridade FEFO |
| Uma rota e `PLASMA` ou `CRIOPRECIPITADO` | Solicito a guia | A guia indica transporte congelado e faixa de −30 a −18 °C |
| Uma rota e `PLAQUETAS` | Solicito a guia | A guia indica controle de temperatura/agitação e faixa de 20 a 24 °C |
| JSON, tipo, origem/destino ou rota inválidos | Envio a requisição | Recebo erro HTTP explícito; não é gerada uma guia parcial |

## Arquitetura

```text
Rede (React)
  ├─ GET /api/v1/rotas/trajeto → Spring: autorização, Dijkstra e Google Routes
  └─ POST /guia-transporte → Cloudflare Worker: validação HTTP
                               → caso de uso: GerarGuiaDeTransporte
                               → domínio: TipoComponente + GuiaDeTransporte
                               → JSON da guia (veículo, cadeia fria, FEFO, checklist)
```

O domínio conhece as faixas de temperatura e os equipamentos por componente; o caso de uso monta a guia; o Worker é o adaptador HTTP. A direção das dependências segue Clean Architecture: o adaptador depende da aplicação, a aplicação depende do domínio, e o domínio não conhece Cloudflare, HTTP, React ou Spring. Assim, a entidade não é um DTO anêmico. A identidade é conferida quando a tela busca a rota no backend; o Worker recebe apenas a rota retornada e não lê dados privados nem grava estado.

## Executar localmente

Requisitos: Node.js 20+ e a API Rota Vital em execução para usar a tela Rede.

1. Instale a dependência do emulador:

   ```powershell
   Set-Location serverless\guia-transporte
   npm install
   ```

2. Em outro terminal, inicie o emulador local do Cloudflare:

   ```powershell
   Set-Location serverless\guia-transporte
   npm run dev
   ```

   A função fica em `http://127.0.0.1:8787/guia-transporte`.

3. Para chamar a função pela tela Rede, copie `frontend\.env.example` para `frontend\.env.local`, configure:

   ```dotenv
   VITE_GUIA_TRANSPORTE_URL=http://127.0.0.1:8787/guia-transporte
   ```

   No PowerShell, a cópia pode ser feita da raiz do repositório com `Copy-Item frontend\.env.example frontend\.env.local`. Reinicie o Vite depois de alterar o arquivo. `ALLOWED_ORIGIN` em `wrangler.toml` já permite `http://localhost:5173` no emulador. Em produção, configure essa variável para a origem real do frontend antes de publicar.

Sem `VITE_GUIA_TRANSPORTE_URL`, a tela continua usando o plano atual do projeto. Se a função estiver configurada e falhar, a tela exibe o erro em vez de ocultar a falha. A publicação em Cloudflare é opcional.

## Contrato HTTP

`POST /guia-transporte` com `Content-Type: application/json`. `rota` é o objeto `RotaNoMapaDTO` devolvido pelo backend e a função verifica se origem, destino e caminho correspondem ao pedido.

```json
{
  "origemId": "BS-01",
  "destinoId": "H-01",
  "tipoComponente": "HEMACIAS",
  "rota": {
    "origemId": "BS-01",
    "destinoId": "H-01",
    "nos": ["BS-01", "P-02", "H-01"],
    "distanciaKm": 7.8,
    "duracaoMinutos": 18,
    "fonte": "GOOGLE_ROUTES",
    "polyline": "encoded-route"
  }
}
```

Exemplo de resposta `200`:

```json
{
  "origemId": "BS-01",
  "destinoId": "H-01",
  "rota": {
    "origemId": "BS-01",
    "destinoId": "H-01",
    "nos": ["BS-01", "P-02", "H-01"],
    "distanciaKm": 7.8,
    "duracaoMinutos": 18,
    "fonte": "GOOGLE_ROUTES",
    "polyline": "encoded-route"
  },
  "equipamento": "Veículo refrigerado monitorado",
  "cadeiaFria": {
    "temperaturaMinimaCelsius": 2,
    "temperaturaMaximaCelsius": 6,
    "controle": "refrigeração"
  },
  "prioridadeDeEnvio": "FEFO",
  "checklist": [
    "Conferir identificação e validade do hemocomponente.",
    "Confirmar o equipamento de refrigeração antes do despacho.",
    "Registrar a temperatura durante o transporte."
  ]
}
```

Erros de entrada usam `application/problem+json` (`400`, `404`, `405` ou `415`). CORS permite apenas `ALLOWED_ORIGIN`; o Worker responde `OPTIONS` para o navegador.

## TDD, cobertura e plano de refatoração

- **Cobertura atual:** 100% de linhas, branches e funções no módulo serverless, verificada com `npm test` (Node test runner). São 17 testes de domínio, caso de uso e adaptador HTTP, incluindo quatro componentes, validação de rota, CORS e erros.
- **Cobertura planejada:** manter 100% para o módulo e adicionar testes de integração contra a API local se a função passar a consultar ou persistir dados.

| Marco | Mudança planejada |
| :--- | :--- |
| **Esta atividade** | O painel Rede pede a guia ao Worker quando configurado e exibe o equipamento/checklist. Rota, despacho, FEFO e autenticação permanecem no backend; não há banco novo nem publicação obrigatória. |
| **Etapa do dia 01** | Consolidar a política de temperatura atualmente representada no domínio Java, no Worker e no frontend em um contrato único do contexto de Distribuição; adicionar testes de contrato para impedir divergência entre as três implementações. |
| **Depois do contrato** | Ao implementar rastreamento persistido, separar telemetria no contexto de Cadeia Fria, conforme [`docs/arquitetura_SO/A-remodelagem-ddd.md`](../../docs/arquitetura_SO/A-remodelagem-ddd.md), com testes de integração para leitura/gravação. |

Comandos de verificação:

```powershell
npm test
npx wrangler dev --local
```

As evidências automatizadas e o exemplo executado no emulador estão em [`docs/evidencias/atividade-serverless.md`](../../docs/evidencias/atividade-serverless.md).
