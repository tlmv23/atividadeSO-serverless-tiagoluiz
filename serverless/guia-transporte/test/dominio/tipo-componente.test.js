import assert from "node:assert/strict";
import test from "node:test";

import { TipoComponente, TipoComponenteInvalido } from "../../src/dominio/tipo-componente.js";

test("cada hemocomponente informa a faixa térmica e o equipamento corretos", () =>
{
  assert.deepEqual(
    ["HEMACIAS", "PLASMA", "PLAQUETAS", "CRIOPRECIPITADO"].map((codigo) =>
    {
      const tipo = TipoComponente.de(codigo);
      return [tipo.temperaturaMinimaCelsius, tipo.temperaturaMaximaCelsius, tipo.equipamento];
    }),
    [
      [2, 6, "Veículo refrigerado monitorado"],
      [-30, -18, "Veículo congelador monitorado"],
      [20, 24, "Veículo com controle de temperatura e agitação"],
      [-30, -18, "Veículo congelador monitorado"]
    ]
  );
});

test("tipo desconhecido é recusado antes de montar a guia", () =>
{
  assert.throws(() => TipoComponente.de("SANGUE"), TipoComponenteInvalido);
  assert.throws(() => TipoComponente.de("toString"), TipoComponenteInvalido);
});
