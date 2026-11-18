from dataclasses import dataclass


class ErroDeDominio(ValueError):
    pass


@dataclass(frozen=True)
class RequisicaoTransporte:
    requisicao_id: str
    hospital: str | None
    bolsas: tuple[str, ...]

    @classmethod
    def de_payload(cls, payload: object) -> "RequisicaoTransporte":
        if not isinstance(payload, dict):
            raise ErroDeDominio("O corpo da requisicao deve ser um objeto JSON.")

        requisicao_id = payload.get("requisicaoId")
        if not isinstance(requisicao_id, str) or not requisicao_id.strip():
            raise ErroDeDominio("requisicaoId obrigatorio")

        hospital = payload.get("hospital")
        if hospital is not None and not isinstance(hospital, str):
            raise ErroDeDominio("hospital deve ser um texto.")

        bolsas = payload.get("bolsas", [])
        if not isinstance(bolsas, list) or not all(
            isinstance(bolsa, str) and bolsa.strip() for bolsa in bolsas
        ):
            raise ErroDeDominio("bolsas deve ser uma lista de identificadores.")

        return cls(
            requisicao_id=requisicao_id.strip(),
            hospital=hospital,
            bolsas=tuple(bolsas),
        )
