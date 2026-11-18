from dataclasses import dataclass

from dominio.requisicao_transporte import RequisicaoTransporte


@dataclass(frozen=True)
class GuiaTransporte:
    codigo: str
    hospital: str | None
    bolsas: tuple[str, ...]

    @classmethod
    def para_requisicao(cls, requisicao: RequisicaoTransporte) -> "GuiaTransporte":
        return cls(
            codigo=f"G-{requisicao.requisicao_id}",
            hospital=requisicao.hospital,
            bolsas=requisicao.bolsas,
        )

    def para_resposta(self) -> dict:
        return {
            "guia": self.codigo,
            "hospital": self.hospital,
            "bolsas": list(self.bolsas),
        }
