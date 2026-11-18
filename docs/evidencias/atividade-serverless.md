# Evidências — Atividade Serverless

## Testes automatizados

No diretório `serverless/guia-transporte`, o comando `npm test` executou **17 testes, 17 aprovados**. Cobertura do código da função: **100% linhas, 100% branches e 100% funções**.

Os cenários cobrem a montagem da guia dos quatro hemocomponentes, origem/destino e caminho inválidos, erros HTTP, método/rota/conteúdo inválidos e preflight CORS.

## Emulador Cloudflare Workers

Com `npm run dev`, o Wrangler iniciou a função localmente em `http://127.0.0.1:8787/guia-transporte`. O POST de teste retornou `HTTP 200`; o preflight do navegador retornou `204`.

Entrada enviada ao Worker, representando o DTO que a tela Rede recebe do backend:

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

Resposta observada no emulador:

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

O exemplo usa uma rota de demonstração e testa a função no emulador local; a aplicação real fornece o DTO obtido em `GET /api/v1/rotas/trajeto`. O deploy em nuvem não foi realizado, pois é opcional.

## Roteiro sugerido para o vídeo (até 3 minutos)

1. **0:00–0:25** — Apresente a HU-07 e explique que a rota continua sendo calculada pelo backend.
2. **0:25–1:20** — Mostre o Worker local, envie um POST ou selecione um hemocomponente na tela Rede e mostre a guia.
3. **1:20–2:10** — Mostre as camadas `adaptadores/http`, `aplicacao` e `dominio`, destacando as faixas de temperatura por componente.
4. **2:10–2:45** — Rode `npm test`, mostre os 17 testes aprovados e a cobertura de 100%; finalize explicando que o deploy em nuvem é opcional.
