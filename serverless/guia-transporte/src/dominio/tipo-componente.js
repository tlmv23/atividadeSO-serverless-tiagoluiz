const ESPECIFICACOES = Object.freeze({
  HEMACIAS: Object.freeze({
    temperaturaMinimaCelsius: 2,
    temperaturaMaximaCelsius: 6,
    equipamento: "Veículo refrigerado monitorado",
    controle: "refrigeração"
  }),
  PLASMA: Object.freeze({
    temperaturaMinimaCelsius: -30,
    temperaturaMaximaCelsius: -18,
    equipamento: "Veículo congelador monitorado",
    controle: "congelamento"
  }),
  PLAQUETAS: Object.freeze({
    temperaturaMinimaCelsius: 20,
    temperaturaMaximaCelsius: 24,
    equipamento: "Veículo com controle de temperatura e agitação",
    controle: "temperatura e agitação"
  }),
  CRIOPRECIPITADO: Object.freeze({
    temperaturaMinimaCelsius: -30,
    temperaturaMaximaCelsius: -18,
    equipamento: "Veículo congelador monitorado",
    controle: "congelamento"
  })
});

export class TipoComponenteInvalido extends Error
{
  constructor(codigo)
  {
    super(`Tipo de hemocomponente não reconhecido: ${String(codigo)}.`);
    this.name = "TipoComponenteInvalido";
  }
}

export class TipoComponente
{
  constructor(codigo, especificacao)
  {
    this.codigo = codigo;
    this.temperaturaMinimaCelsius = especificacao.temperaturaMinimaCelsius;
    this.temperaturaMaximaCelsius = especificacao.temperaturaMaximaCelsius;
    this.equipamento = especificacao.equipamento;
    this.controle = especificacao.controle;
    Object.freeze(this);
  }

  static de(codigo)
  {
    if (typeof codigo !== "string" || !Object.hasOwn(ESPECIFICACOES, codigo))
    {
      throw new TipoComponenteInvalido(codigo);
    }

    const especificacao = ESPECIFICACOES[codigo];
    return new TipoComponente(codigo, especificacao);
  }
}
