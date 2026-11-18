import assert from "node:assert/strict";
import test from "node:test";

import {
  GerarGuiaDeTransporte,
  RotaInvalidaDoRotavital
} from "../../src/aplicacao/gerar-guia-de-transporte.js";

const pedido = {
  origemId: "BS-01",
  destinoId: "H-01",
  tipoComponente: "PLASMA"
};
const rota = {
  origemId: "BS-01",
  destinoId: "H-01",
  nos: ["BS-01", "H-01"],
  distanciaKm: 7.8,
  duracaoMinutos: 18,
  fonte: "CONEXOES_DA_REDE",
  polyline: null
};

test("caso de uso monta a guia com a rota calculada pelo Rota Vital", () =>
{
  const casoDeUso = new GerarGuiaDeTransporte();

  const guia = casoDeUso.executar({ ...pedido, rota });

  assert.equal(guia.paraResposta().cadeiaFria.temperaturaMinimaCelsius, -30);
});

test("tipo inválido é recusado antes de criar a guia", () =>
{
  const casoDeUso = new GerarGuiaDeTransporte();

  assert.throws(() => casoDeUso.executar({ ...pedido, rota, tipoComponente: "X" }));
});

test("rota inconsistente enviada pelo Rota Vital é sinalizada como inválida", () =>
{
  const casoDeUso = new GerarGuiaDeTransporte();

  assert.throws(
    () => casoDeUso.executar({ ...pedido, rota: { ...rota, destinoId: "H-02" } }),
    RotaInvalidaDoRotavital
  );
});

test("erros inesperados durante a leitura da rota continuam explícitos", () =>
{
  const rotaComFalhaAoLer = {
    get origemId()
    {
      throw new Error("falha inesperada");
    }
  };
  const casoDeUso = new GerarGuiaDeTransporte();

  assert.throws(
    () => casoDeUso.executar({ ...pedido, rota: rotaComFalhaAoLer }),
    /falha inesperada/
  );
});
