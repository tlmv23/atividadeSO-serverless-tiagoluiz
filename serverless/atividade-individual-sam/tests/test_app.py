import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import app


class LambdaHandlerTests(unittest.TestCase):
    def setUp(self):
        app.contador = 0

    def invocar(self, pedido):
        return app.lambda_handler({"body": json.dumps(pedido)}, None)

    def test_gera_guia_da_requisicao(self):
        resposta = self.invocar(
            {
                "requisicaoId": "R-001",
                "hospital": "H-Recife",
                "bolsas": ["O-NEG-0142"],
            }
        )

        self.assertEqual(resposta["statusCode"], 201)
        corpo = json.loads(resposta["body"])
        self.assertEqual(corpo["guia"], "G-R-001")
        self.assertEqual(corpo["hospital"], "H-Recife")
        self.assertEqual(corpo["bolsas"], ["O-NEG-0142"])

    def test_rejeita_requisicao_sem_identificador(self):
        resposta = self.invocar({"hospital": "H-Recife"})

        self.assertEqual(resposta["statusCode"], 400)
        self.assertIn("requisicaoId", json.loads(resposta["body"])["erro"])

    def test_contador_muda_entre_invocacoes_no_mesmo_ambiente(self):
        primeiro = json.loads(self.invocar({"requisicaoId": "R-001"})["body"])
        segundo = json.loads(self.invocar({"requisicaoId": "R-002"})["body"])

        self.assertEqual(primeiro["invocacaoNesteAmbiente"], 1)
        self.assertEqual(segundo["invocacaoNesteAmbiente"], 2)

    def test_demora_ativa_pausa_de_cinco_segundos(self):
        with patch("app.time.sleep") as sleep:
            resposta = self.invocar({"requisicaoId": "R-003", "demorar": True})

        sleep.assert_called_once_with(5)
        self.assertEqual(resposta["statusCode"], 201)


if __name__ == "__main__":
    unittest.main()
