from dominio.guia_transporte import GuiaTransporte
from dominio.requisicao_transporte import RequisicaoTransporte


def gerar_guia(requisicao: RequisicaoTransporte) -> GuiaTransporte:
    return GuiaTransporte.para_requisicao(requisicao)
