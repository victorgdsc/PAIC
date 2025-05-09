from typing import Dict, Optional, Tuple


def evaluate_model_significance(
    pvalues: Optional[Dict[str, float]],
) -> Tuple[bool, str, Dict[str, float]]:
    if not pvalues:
        return False, "Sem p-valores disponíveis.", {}
    significant = all(p < 0.05 for p in pvalues.values())
    if significant:
        return True, "Sim. (p < 0.05).", pvalues
    else:
        return False, "Não. (p ≥ 0.05).", pvalues


def evaluate_model_confidence(
    data_points: int, warning: Optional[str] = None, min_data_points: int = 30
) -> Tuple[str, str, str]:
    if warning:
        return "Baixa", f"Baixa. {warning}", warning

    if data_points < min_data_points:
        return "Média", "Volume de dados um pouco baixo para alta confiabilidade.", None

    return (
        "Alta",
        "O modelo foi ajustado com base em dados consistentes e não apresentou problemas.",
        None,
    )


__all__ = ["evaluate_model_significance", "evaluate_model_confidence"]
