# Atividade individual 1 — Serverless com AWS SAM local

Funcao HTTP e acionada por evento para gerar uma guia a partir de uma requisicao do Rota Vital. O projeto usa AWS SAM local; nao precisa criar uma conta AWS nem publicar a funcao.

## Requisitos

- Docker Desktop em execucao.
- AWS SAM CLI (`sam --version`).
- Git Bash ou WSL no Windows.
- Python 3.12 para corresponder ao runtime configurado.

## Especificacao (SDD)

**Como equipe de transporte**, quero gerar uma guia a partir de uma requisicao hospitalar, para identificar as bolsas e o hospital de destino.

| Dado | Quando | Entao |
| :--- | :--- | :--- |
| Um corpo JSON com `requisicaoId` | A funcao e invocada | Retorna HTTP 201 com codigo da guia, hospital, bolsas e contador do ambiente |
| Um corpo sem `requisicaoId` ou JSON invalido | A funcao e invocada | Retorna HTTP 400 com um erro explicito |
| O campo `demorar` e `true` | A funcao e invocada | Aguarda cinco segundos para demonstrar o timeout configurado |

## Arquitetura e dominio

- `src/app.py` e o adaptador Lambda: interpreta o evento, le o body, controla o contador global e monta a resposta HTTP.
- `src/aplicacao/gerar_guia.py` representa o caso de uso de gerar uma guia.
- `src/dominio/` contem o modelo de requisicao e a regra de criacao da guia.
- `template.yaml` configura o runtime Python 3.12, memoria de 128 MB, timeout inicial de 3 segundos e o gatilho `POST /guias`.

O caso de uso depende do dominio; o adaptador conhece o caso de uso, mas o dominio nao conhece Lambda, API Gateway ou SAM. O contador e intencionalmente global para observar o ciclo de vida do ambiente; ele nao e estado de negocio confiavel.

## Testes locais da logica

Na pasta deste projeto:

```bash
python -m unittest discover -s tests -v
```

Esses testes validam a regra e o handler Python. Eles nao substituem os experimentos com o emulador SAM e Docker.

## Invocacao por evento e tempos

No Git Bash, entre nesta pasta e rode:

```bash
sam --version
docker --version
sam build
time sam local invoke -e events/pedido.json
time sam local invoke -e events/pedido.json
```

Registre os dois tempos reais na tabela. A primeira invocacao costuma incluir o custo de inicializar o container; nao copie tempos de outra maquina.

| Invocacao | Tempo observado |
| :--- | :--- |
| Primeira | 8.154 |
| Segunda | 8.214 |

Opcionalmente, gere de novo o evento no formato do API Gateway:

```bash
sam local generate-event apigateway aws-proxy --method POST --path guias --body '{"requisicaoId":"R-001","hospital":"H-Recife","bolsas":["O-NEG-0142"]}' > events/pedido.json
sam build
```

## Gatilho HTTP

Em um terminal:

```bash
sam local start-api
```

Em outro terminal Git Bash, chame a funcao tres vezes:

```bash
curl -i -X POST http://127.0.0.1:3000/guias \
  -H "Content-Type: application/json" \
  -d '{"requisicaoId":"R-002","hospital":"H-Caruaru"}'
```

Uma resposta bem-sucedida usa HTTP 201. O corpo inclui `guia`, `hospital`, `bolsas` e `invocacaoNesteAmbiente`.

## Experimento de reaproveitamento

1. Pare o `start-api` com `Ctrl+C` e inicie sem a opcao warm:

   ```bash
   sam local start-api
   ```

2. Envie a mesma chamada HTTP algumas vezes e registre o contador.
3. Pare o servidor e inicie com containers warm:

   ```bash
   sam local start-api --warm-containers LAZY
   ```

4. Repita as chamadas e registre o contador. O valor pode depender do ciclo de vida que o emulador atribuiu ao container; descreva exatamente o que observou.

| Modo | Valores de `invocacaoNesteAmbiente` observados |
| :--- | :--- |
| Sem `--warm-containers` | preencher |
| Com `--warm-containers LAZY` | preencher |

## Experimento de timeout

Com o timeout inicial de 3 segundos, envie:

```bash
curl -i -X POST http://127.0.0.1:3000/guias \
  -H "Content-Type: application/json" \
  -d '{"requisicaoId":"R-003","demorar":true}'
```

Registre o erro exibido pelo SAM. Depois altere `Globals.Function.Timeout` em `template.yaml` de `3` para `10`, reconstrua e reinicie o `start-api`:

```bash
sam build
sam local start-api
```

Repita o `curl`. A funcao deve completar a espera de cinco segundos e responder HTTP 201.

## Respostas para o README

Revise e escreva com suas palavras. Complete os valores de tempos e contadores com as suas evidencias.

1. **Por que a primeira invocacao pode demorar mais?** No cold start, a plataforma prepara o ambiente de execucao, inicializa o runtime e carrega o codigo e as dependencias. Na fase Init, esse trabalho ocorre antes do handler processar o evento.

2. **O que o contador mostrou?** Registre aqui os valores vistos sem e com `--warm-containers LAZY`. Uma variavel global pode persistir enquanto o mesmo ambiente e reutilizado, mas o Lambda pode criar ou descartar ambientes; por isso, ela nao serve como armazenamento confiavel entre invocacoes.

3. **O que aconteceu com `demorar=true`?** Com timeout de 3 segundos, a execucao que espera 5 segundos deve exceder o limite configurado. Com timeout de 10 segundos, a mesma requisicao deve terminar. No AWS Lambda, o limite maximo de uma invocacao e 15 minutos; tarefas mais longas devem ser divididas ou processadas de forma assincrona, por exemplo com SQS ou Step Functions.

4. **Quanto custam um milhao de execucoes com 128 MB e 100 ms?**

   - Memoria: `128 MB = 0,125 GB`.
   - Computacao por execucao: `0,125 GB x 0,1 s = 0,0125 GB-s`.
   - Computacao total: `0,0125 x 1.000.000 = 12.500 GB-s`.
   - Requisicoes: `(1.000.000 / 1.000.000) x US$ 0,20 = US$ 0,20`.
   - Computacao: `12.500 x US$ 0,0000166667 = US$ 0,20833375`.
   - Total estimado: `US$ 0,40833375`, aproximadamente **US$ 0,41**, sem considerar faixa gratuita ou outros servicos.

5. **Onde isso faria sentido no Rota Vital?** Uma funcao curta e acionada por evento pode gerar uma guia quando chega uma requisicao. Nao e adequada para guardar o estado oficial das bolsas nem para monitoramento continuo ou tarefas longas; esses dados precisam de armazenamento ou processamento apropriado.

## Uso de IA

Declare com suas palavras as ferramentas de IA usadas, para que foram usadas e como voce validou o resultado. Exemplo: “Usei um assistente de IA para revisar a estrutura do handler, dos testes e deste README. Validei a logica com `python -m unittest` e conferi as respostas empiricas executando os comandos SAM e salvando as saidas em `evidencias/`.” Ajuste para descrever fielmente o que voce fez.

## Evidencias e video

Salve capturas reais em [`evidencias/`](evidencias/README.md), incluindo os tempos, o contador, a chamada HTTP e o timeout antes e depois do ajuste.
<img width="1167" height="506" alt="image" src="https://github.com/user-attachments/assets/21fa1030-c26a-4947-aed4-f4c9cc9d32d1" />


No video de ate 3 minutos, mostre:

1. `sam local invoke` duas vezes e os tempos.
2. `sam local start-api` e uma chamada `curl`.
3. O contador com e sem containers warm.
4. O erro com timeout de 3 segundos e a resposta depois de aumentar para 10.
