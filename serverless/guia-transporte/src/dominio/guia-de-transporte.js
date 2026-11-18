export class GuiaDeTransporte
{
  constructor({ origemId, destinoId, rota, componente })
  {
    if (!origemId || !destinoId || origemId === destinoId)
    {
      throw new TypeError("A guia precisa de uma origem e um destino diferentes.");
    }
    if (rota.origemId !== origemId || rota.destinoId !== destinoId)
    {
      throw new TypeError("A rota retornada não corresponde à origem e ao destino solicitados.");
    }
    if (!Array.isArray(rota.nos) || rota.nos.length < 2
        || rota.nos[0] !== origemId || rota.nos[rota.nos.length - 1] !== destinoId)
    {
      throw new TypeError("A rota precisa conter os pontos de origem e destino na ordem correta.");
    }
    if (!Number.isFinite(rota.distanciaKm) || rota.distanciaKm < 0
        || !Number.isInteger(rota.duracaoMinutos) || rota.duracaoMinutos < 0
        || typeof rota.fonte !== "string" || rota.fonte.length === 0)
    {
      throw new TypeError("A rota retornada contém distância, duração ou fonte inválida.");
    }

    this.origemId = origemId;
    this.destinoId = destinoId;
    this.rota = Object.freeze({
      origemId: rota.origemId,
      destinoId: rota.destinoId,
      nos: Object.freeze([...rota.nos]),
      distanciaKm: rota.distanciaKm,
      duracaoMinutos: rota.duracaoMinutos,
      fonte: rota.fonte,
      polyline: rota.polyline ?? null
    });
    this.componente = componente;
    Object.freeze(this);
  }

  paraResposta()
  {
    return {
      origemId: this.origemId,
      destinoId: this.destinoId,
      rota: this.rota,
      equipamento: this.componente.equipamento,
      cadeiaFria: {
        temperaturaMinimaCelsius: this.componente.temperaturaMinimaCelsius,
        temperaturaMaximaCelsius: this.componente.temperaturaMaximaCelsius,
        controle: this.componente.controle
      },
      prioridadeDeEnvio: "FEFO",
      checklist: [
        "Conferir identificação e validade do hemocomponente.",
        `Confirmar o equipamento de ${this.componente.controle} antes do despacho.`,
        "Registrar a temperatura durante o transporte."
      ]
    };
  }
}
