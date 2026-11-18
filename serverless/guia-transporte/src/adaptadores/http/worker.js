import { GerarGuiaDeTransporte, RotaInvalidaDoRotavital } from "../../aplicacao/gerar-guia-de-transporte.js";
import { TipoComponenteInvalido } from "../../dominio/tipo-componente.js";

const ROTA = "/guia-transporte";
const TIPOS_DE_CONTEUDO_JSON = ["application/json"];
const ORIGEM_LOCAL = "http://localhost:5173";

function problema(status, titulo, detalhe, instancia, tipo = "about:blank")
{
  return Response.json(
    { type: tipo, title: titulo, status, detail: detalhe, instance: instancia },
    {
      status,
      headers: { "Content-Type": "application/problem+json; charset=utf-8" }
    }
  );
}

export async function tratarRequisicao(request)
{
  const url = new URL(request.url);
  if (url.pathname !== ROTA)
  {
    return problema(404, "Rota não encontrada", "Use POST /guia-transporte.", url.pathname);
  }
  if (request.method !== "POST")
  {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  const tipoDeConteudo = request.headers.get("Content-Type")?.split(";")[0]?.toLowerCase();
  if (!TIPOS_DE_CONTEUDO_JSON.includes(tipoDeConteudo))
  {
    return problema(415, "Tipo de conteúdo não suportado", "Envie o corpo como application/json.", url.pathname);
  }

  let dados;
  try
  {
    dados = await request.json();
  }
  catch (causa)
  {
    if (causa instanceof SyntaxError)
    {
      return problema(400, "Requisição inválida", "O corpo precisa ser um JSON válido.", url.pathname);
    }
    throw causa;
  }

  if (!dados || typeof dados !== "object" || Array.isArray(dados))
  {
    return problema(400, "Requisição inválida", "Envie origemId, destinoId e tipoComponente.", url.pathname);
  }
  if (typeof dados.origemId !== "string" || dados.origemId.trim() === ""
      || typeof dados.destinoId !== "string" || dados.destinoId.trim() === "")
  {
    return problema(400, "Requisição inválida", "Informe origemId e destinoId.", url.pathname);
  }
  if (dados.origemId === dados.destinoId)
  {
    return problema(400, "Requisição inválida", "A origem e o destino devem ser diferentes.", url.pathname);
  }
  if (typeof dados.tipoComponente !== "string")
  {
    return problema(400, "Requisição inválida", "Informe o tipoComponente.", url.pathname);
  }
  if (!dados.rota || typeof dados.rota !== "object" || Array.isArray(dados.rota))
  {
    return problema(400, "Requisição inválida", "Informe a rota calculada pelo Rota Vital.", url.pathname);
  }

  try
  {
    const casoDeUso = new GerarGuiaDeTransporte();
    const guia = casoDeUso.executar(dados);
    return Response.json(guia.paraResposta());
  }
  catch (causa)
  {
    if (causa instanceof TipoComponenteInvalido)
    {
      return problema(400, "Requisição inválida", causa.message, url.pathname);
    }
    if (causa instanceof RotaInvalidaDoRotavital)
    {
      return problema(400, "Rota inválida", causa.message, url.pathname);
    }
    throw causa;
  }
}

function responderComCors(request, env, resposta)
{
  const origem = request.headers.get("Origin");
  const origemPermitida = env.ALLOWED_ORIGIN || ORIGEM_LOCAL;
  const headers = new Headers(resposta.headers);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, X-Usuario-Id");

  if (!origem || origem === origemPermitida)
  {
    headers.set("Access-Control-Allow-Origin", origemPermitida);
  }

  return new Response(resposta.body, {
    status: resposta.status,
    statusText: resposta.statusText,
    headers
  });
}

export default {
  async fetch(request, env)
  {
    const url = new URL(request.url);
    if (request.method === "OPTIONS")
    {
      const resposta = url.pathname === ROTA
        ? new Response(null, { status: 204 })
        : problema(404, "Rota não encontrada", "Use POST /guia-transporte.", url.pathname);
      return responderComCors(request, env, resposta);
    }

    return responderComCors(request, env, await tratarRequisicao(request));
  }
};
