import assert from "node:assert/strict";
import test from "node:test";

import worker, { tratarRequisicao } from "../../src/adaptadores/http/worker.js";

const rota = {
  origemId: "BS-01",
  destinoId: "H-01",
  nos: ["BS-01", "P-02", "H-01"],
  distanciaKm: 7.8,
  duracaoMinutos: 18,
  fonte: "GOOGLE_ROUTES",
  polyline: "encoded-route"
};

function requisicao({ path = "/guia-transporte", method = "POST", headers = {}, body } = {})
{
  return new Request(`http://localhost${path}`, {
    method,
    headers: new Headers(headers),
    body
  });
}

function pedido(overrides = {})
{
  return {
    origemId: "BS-01",
    destinoId: "H-01",
    tipoComponente: "HEMACIAS",
    rota,
    ...overrides
  };
}

function jsonHeaders(extra = {})
{
  return { "Content-Type": "application/json", "X-Usuario-Id": "medico-1", ...extra };
}

async function lerProblema(resposta)
{
  assert.equal(resposta.headers.get("Content-Type"), "application/problem+json; charset=utf-8");
  return resposta.json();
}

test("POST retorna uma guia montada a partir da rota do Rota Vital", async () =>
{
  const resposta = await tratarRequisicao(
    requisicao({ headers: jsonHeaders(), body: JSON.stringify(pedido()) })
  );

  assert.equal(resposta.status, 200);
  const guia = await resposta.json();
  assert.equal(guia.equipamento, "Veículo refrigerado monitorado");
  assert.deepEqual(guia.cadeiaFria, {
    temperaturaMinimaCelsius: 2,
    temperaturaMaximaCelsius: 6,
    controle: "refrigeração"
  });
  assert.equal(guia.prioridadeDeEnvio, "FEFO");
});

test("endereço e método incorretos recebem respostas HTTP explícitas", async () =>
{
  const naoEncontrada = await tratarRequisicao(requisicao({ path: "/outro" }));
  const metodo = await worker.fetch(requisicao({ method: "GET" }), {});

  assert.equal(naoEncontrada.status, 404);
  assert.match((await lerProblema(naoEncontrada)).detail, /POST \/guia-transporte/);
  assert.equal(metodo.status, 405);
  assert.equal(metodo.headers.get("Allow"), "POST");
});

test("recusa conteúdo não JSON, corpo malformado e campos inválidos", async () =>
{
  const semJson = await tratarRequisicao(requisicao({
    headers: { "Content-Type": "text/plain", "X-Usuario-Id": "medico-1" },
    body: "{}"
  }));
  const semTipoDeConteudo = await tratarRequisicao(requisicao({
    headers: { "X-Usuario-Id": "medico-1" },
    body: "{}"
  }));
  const jsonMalformado = await tratarRequisicao(requisicao({
    headers: jsonHeaders(),
    body: "{"
  }));
  const semOrigem = await tratarRequisicao(requisicao({
    headers: jsonHeaders(),
    body: JSON.stringify(pedido({ origemId: "" }))
  }));
  const mesmaOrigemDestino = await tratarRequisicao(requisicao({
    headers: jsonHeaders(),
    body: JSON.stringify(pedido({ destinoId: "BS-01" }))
  }));
  const semComponente = await tratarRequisicao(requisicao({
    headers: jsonHeaders(),
    body: JSON.stringify(pedido({ tipoComponente: 1 }))
  }));
  const corpoNulo = await tratarRequisicao(requisicao({
    headers: jsonHeaders(),
    body: "null"
  }));
  const corpoLista = await tratarRequisicao(requisicao({
    headers: jsonHeaders(),
    body: "[]"
  }));
  const tipoComMaiusculas = await tratarRequisicao(requisicao({
    headers: { ...jsonHeaders(), "Content-Type": "Application/JSON; charset=utf-8" },
    body: JSON.stringify(pedido())
  }));
  const semRota = await tratarRequisicao(requisicao({
    headers: jsonHeaders(),
    body: JSON.stringify({
      origemId: "BS-01",
      destinoId: "H-01",
      tipoComponente: "HEMACIAS"
    })
  }));

  assert.equal(semJson.status, 415);
  assert.equal(semTipoDeConteudo.status, 415);
  assert.equal(jsonMalformado.status, 400);
  assert.equal(semOrigem.status, 400);
  assert.equal(mesmaOrigemDestino.status, 400);
  assert.equal(semComponente.status, 400);
  assert.equal(corpoNulo.status, 400);
  assert.equal(corpoLista.status, 400);
  assert.equal(tipoComMaiusculas.status, 200);
  assert.equal(semRota.status, 400);
});

test("erros de leitura do corpo que não são JSON malformado continuam explícitos", async () =>
{
  const corpoComErro = new ReadableStream({
    start(controller)
    {
      controller.error(new Error("falha de leitura"));
    }
  });
  const req = new Request("http://localhost/guia-transporte", {
    method: "POST",
    headers: jsonHeaders(),
    body: corpoComErro,
    duplex: "half"
  });

  await assert.rejects(() => tratarRequisicao(req), /falha de leitura/);
});

test("recusa tipo de componente desconhecido", async () =>
{
  const tipoDesconhecido = await tratarRequisicao(requisicao({
    headers: jsonHeaders(),
    body: JSON.stringify({ ...pedido({ tipoComponente: "SANGUE" }), rota })
  }));

  assert.equal(tipoDesconhecido.status, 400);
});

test("rejeita uma rota com dados incompatíveis com o pedido", async () =>
{
  const rotaDeOutroDestino = await tratarRequisicao(requisicao({
    headers: jsonHeaders(),
    body: JSON.stringify({ ...pedido(), rota: { ...rota, destinoId: "H-02" } })
  }));

  assert.equal(rotaDeOutroDestino.status, 400);
});

test("o endpoint responde ao preflight apenas para a origem configurada", async () =>
{
  const preflightPermitido = await worker.fetch(requisicao({
    method: "OPTIONS",
    headers: { Origin: "http://localhost:5173" }
  }), { ALLOWED_ORIGIN: "http://localhost:5173" });
  const preflightNaoPermitido = await worker.fetch(requisicao({
    method: "OPTIONS",
    headers: { Origin: "https://outro-site.example" }
  }), { ALLOWED_ORIGIN: "http://localhost:5173" });

  assert.equal(preflightPermitido.status, 204);
  assert.equal(preflightPermitido.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173");
  assert.equal(preflightNaoPermitido.headers.get("Access-Control-Allow-Origin"), null);

  const origemPadrao = await worker.fetch(requisicao({
    method: "POST",
    headers: { ...jsonHeaders(), Origin: "http://localhost:5173" },
    body: JSON.stringify(pedido())
  }), { ALLOWED_ORIGIN: "" });
  const preflightDesconhecido = await worker.fetch(requisicao({
    method: "OPTIONS",
    path: "/outro"
  }), {});

  assert.equal(origemPadrao.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173");
  assert.equal(origemPadrao.status, 200);
  assert.equal(preflightDesconhecido.status, 404);
});

test("erro inesperado de configuração não é escondido", async () =>
{
  const propriedade = Object.getOwnPropertyDescriptor(Response, "json");
  Object.defineProperty(Response, "json", {
    ...propriedade,
    value()
    {
      throw new Error("falha inesperada de serialização");
    }
  });

  try
  {
    await assert.rejects(
      () => tratarRequisicao(requisicao({
        headers: jsonHeaders(),
        body: JSON.stringify(pedido())
      })),
      /falha inesperada de serialização/
    );
  }
  finally
  {
    Object.defineProperty(Response, "json", propriedade);
  }
});
