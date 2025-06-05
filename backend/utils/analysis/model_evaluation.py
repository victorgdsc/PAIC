from typing import Dict, Optional, Tuple


def evaluate_model_significance(
    pvalues: Optional[Dict[str, float]],
) -> Tuple[bool, str, Dict[str, float]]:
    if not pvalues:
        return False, "Sem p-valores disponíveis.", {}
    keys_to_check = [k for k in pvalues if k not in ("const", "sigma2")]
    significant = any(pvalues[k] < 0.05 for k in keys_to_check)
    if significant:
        return True, "Sim. Pelo menos 1 coeficiente relevante é significativo (p < 0.05).", pvalues
    else:
        return False, "Não. Nenhum coeficiente relevante é significativo (p ≥ 0.05).", pvalues


def evaluate_model_confidence(
    data_points: int,
    warning: Optional[str] = None,
    min_data_points: int = 30,
    rmse: Optional[float] = None,
    mean_ci_width: Optional[float] = None,
    rmse_thresholds: Tuple[float, float] = (2.0, 5.0),
    ci_width_thresholds: Tuple[float, float] = (2.0, 5.0)
) -> Tuple[str, str, str]:
    """
    Avalia a confiança do modelo considerando:
    - Número de pontos
    - Warnings
    - Erro histórico (RMSE)
    - Largura média do intervalo de confiança

    Retorna: (nível, descrição, motivo)
    """
    if warning:
        return "Baixa", f"Baixa. {warning}", warning

    if data_points < min_data_points:
        return "Média", "Volume de dados um pouco baixo para alta confiabilidade.", "poucos dados"

    rmse_level = None
    ci_level = None
    rmse_desc = ""
    ci_desc = ""
    if rmse is not None:
        if rmse < rmse_thresholds[0]:
            rmse_level = "Alta"
            rmse_desc = f"Erro histórico baixo (RMSE={rmse:.2f})."
        elif rmse < rmse_thresholds[1]:
            rmse_level = "Média"
            rmse_desc = f"Erro histórico moderado (RMSE={rmse:.2f})."
        else:
            rmse_level = "Baixa"
            rmse_desc = f"Erro histórico alto (RMSE={rmse:.2f})."
    if mean_ci_width is not None:
        if mean_ci_width < ci_width_thresholds[0]:
            ci_level = "Alta"
            ci_desc = f"Intervalo de confiança estreito (média={mean_ci_width:.2f})."
        elif mean_ci_width < ci_width_thresholds[1]:
            ci_level = "Média"
            ci_desc = f"Intervalo de confiança moderado (média={mean_ci_width:.2f})."
        else:
            ci_level = "Baixa"
            ci_desc = f"Intervalo de confiança largo (média={mean_ci_width:.2f})."

    levels = [lvl for lvl in [rmse_level, ci_level] if lvl]
    if not levels:
        return "Alta", "O modelo foi ajustado com base em dados consistentes e não apresentou problemas.", None
    if "Baixa" in levels:
        return "Baixa", f"Baixa. {' '.join([rmse_desc, ci_desc]).strip()}", "erro ou intervalo alto"
    if "Média" in levels:
        return "Média", f"Média. {' '.join([rmse_desc, ci_desc]).strip()}", "erro ou intervalo moderado"
    return "Alta", f"Alta. {' '.join([rmse_desc, ci_desc]).strip()}", None



__all__ = ["evaluate_model_significance", "evaluate_model_confidence"]
