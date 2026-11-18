import { GuiaDeTransporte } from "../dominio/guia-de-transporte.js";
import { TipoComponente } from "../dominio/tipo-componente.js";

export class GerarGuiaDeTransporte
{
  executar({ origemId, destinoId, tipoComponente, rota })
  {
    const componente = TipoComponente.de(tipoComponente);

    try
    {
      return new GuiaDeTransporte({ origemId, destinoId, rota, componente });
    }
    catch (causa)
    {
      if (causa instanceof TypeError)
      {
        throw new RotaInvalidaDoRotavital(causa.message, { cause: causa });
      }
      throw causa;
    }
  }
}

export class RotaInvalidaDoRotavital extends Error
{
  constructor(message, options)
  {
    super(message, options);
    this.name = "RotaInvalidaDoRotavital";
  }
}
