import json
import time

from aplicacao.gerar_guia import gerar_guia
from dominio.requisicao_transporte import ErroDeDominio, RequisicaoTransporte


contador = 0


def lambda_handler(event, context):
    global contador
    contador += 1

    try:
        pedido = json.loads(event.get("body") or "{}")
        requisicao = RequisicaoTransporte.de_payload(pedido)
    except (json.JSONDecodeError, TypeError, ErroDeDominio) as erro:
        return {
            "statusCode": 400,
            "body": json.dumps({"erro": str(erro)}),
        }

    if pedido.get("demorar"):
        time.sleep(5)

    guia = gerar_guia(requisicao)
    resposta = {
        **guia.para_resposta(),
        "invocacaoNesteAmbiente": contador,
    }

    return {
        "statusCode": 201,
        "body": json.dumps(resposta),
    }
