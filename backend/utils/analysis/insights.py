from typing import Dict, Any, List


def generate_insights(analysis_results: Dict[str, Any]) -> List[Dict[str, Any]]:

    insights = []

    delay_stats = analysis_results.get("delayStatistics")
    if not delay_stats:
        return [
            "Não foi possível gerar insights devido à ausência de estatísticas de atraso."
        ]

    media = delay_stats.get("mediaAtraso")
    if media is not None:
        if media > 2:
            insights.append(
                {
                    "tipo": "estatistica",
                    "titulo": "Estatísticas Gerais de Atraso",
                    "descricao": "Atrasos médios elevados. Avalie processos logísticos.",
                }
            )
        elif media < 0:
            insights.append(
                {
                    "tipo": "estatistica",
                    "titulo": "Estatísticas Gerais de Atraso",
                    "descricao": "Entregas adiantadas. Avalie se há oportunidades de otimização.",
                }
            )
        else:
            insights.append(
                {
                    "tipo": "estatistica",
                    "titulo": "Estatísticas Gerais de Atraso",
                    "descricao": "Atrasos dentro do esperado.",
                }
            )

    factors = analysis_results.get("fatores")
    if factors:
        for factor in factors:
            values = sorted(
                factor.get("valores", []),
                key=lambda x: x.get("quantidade", 0),
                reverse=True,
            )
            top_value = values[0] if values else None
            if top_value and top_value.get("quantidade", 0) > 0:
                insights.append(
                    {
                        "tipo": "fator",
                        "titulo": f"Fator: {factor.get('fator', '')}",
                        "descricao": f"Valor mais impactante: {top_value.get('valor', '')} ({top_value.get('quantidade', 0)} ocorrências)",
                    }
                )

    if "forecast" in analysis_results:
        forecast = analysis_results["forecast"]
        if forecast:

            if isinstance(forecast[0], dict) and "value" in forecast[0]:
                values = [item.get("value", 0) for item in forecast]
            else:

                values = [item for item in forecast if isinstance(item, (int, float))]
            if values:
                avg_forecast = sum(values) / len(values)
                insights.append(
                    {
                        "tipo": "previsao",
                        "titulo": "Previsão de Atraso",
                        "descricao": f"Previsão média de atraso nos próximos meses: {avg_forecast:.2f} dias",
                    }
                )

    return insights
