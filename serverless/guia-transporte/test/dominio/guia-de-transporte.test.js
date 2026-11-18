import assert from "node:assert/strict";
import test from "node:test";

import { GuiaDeTransporte } from "../../src/dominio/guia-de-transporte.js";
import { TipoComponente } from "../../src/dominio/tipo-componente.js";

const rota = {
  origemId: "BS-01",
  destinoId: "H-01",
  nos: ["BS-01", "P-02", "H-01"],
  distanciaKm: 7.8,
  duracaoMinutos: 18,
  fonte: "GOOGLE_ROUTES",
  polyline: "encoded-route"
};

test("guia inclui trajeto, equipamento, cadeia fria, checklist e prioridade FEFO", () =>
{
  const guia = new GuiaDeTransporte({
    origemId: "BS-01",
    destinoId: "H-01",
    rota,
    componente: TipoComponente.de("HEMACIAS")
  });

  assert.deepEqual(guia.paraResposta(), {
    origemId: "BS-01",
    destinoId: "H-01",
    rota,
    equipamento: "Veículo refrigerado monitorado",
    cadeiaFria: {
      temperaturaMinimaCelsius: 2,
      temperaturaMaximaCelsius: 6,
      controle: "refrigeração"
    },
    prioridadeDeEnvio: "FEFO",
    checklist: [
      "Conferir identificação e validade do hemocomponente.",
      "Confirmar o equipamento de refrigeração antes do despacho.",
      "Registrar a temperatura durante o transporte."
    ]
  });
  assert.ok(Object.isFrozen(guia));
  assert.ok(Object.isFrozen(guia.rota.nos));
});

test("guia não aceita rota de outro destino, sequência inválida ou métricas negativas", () =>
{
  const criar = (alteracoes = {}) => new GuiaDeTransporte({
    origemId: "BS-01",
    destinoId: "H-01",
    rota: { ...rota, ...alteracoes },
    componente: TipoComponente.de("PLASMA")
  });

  assert.throws(() => criar({ destinoId: "H-02" }), /não corresponde/);
  assert.throws(() => criar({ nos: ["H-01", "BS-01"] }), /ordem correta/);
  assert.throws(() => criar({ distanciaKm: -1 }), /inválida/);
  assert.throws(() => criar({ duracaoMinutos: 1.5 }), /inválida/);
});

test("guia não aceita origem igual ao destino", () =>
{
  assert.throws(
    () => new GuiaDeTransporte({
      origemId: "BS-01",
      destinoId: "BS-01",
      rota,
      componente: TipoComponente.de("HEMACIAS")
    }),
    /diferentes/
  );
});
