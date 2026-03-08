import type { Project, Asset, InferenceGIE, InferenceATGI, TimelineEvent, PassivoAjustado, PipelineStep, RagMessage } from '@/types/grafter';

export const mockProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'DD Taesa Target Nordeste Q2 2026',
    target_company: 'Taesa S.A. — Lote Nordeste',
    status: 'ready',
    seller_price: 850000000,
    passivo_total_ajustado: 759000000,
    asset_count: 247,
    avg_risk: 'MEDIUM',
    inference_count: 14,
    created_at: '2026-02-15T10:30:00Z',
  },
  {
    id: 'proj-002',
    name: 'DD ISA CTEEP SP-Interior Q1 2026',
    target_company: 'ISA CTEEP — Região Interior SP',
    status: 'processing',
    seller_price: 420000000,
    passivo_total_ajustado: null,
    asset_count: 134,
    avg_risk: 'HIGH',
    inference_count: 6,
    created_at: '2026-03-01T08:00:00Z',
  },
  {
    id: 'proj-003',
    name: 'DD Eletronorte Tucuruí Q3 2025',
    target_company: 'Eletronorte — UHE Tucuruí',
    status: 'complete',
    seller_price: 1200000000,
    passivo_total_ajustado: 1045000000,
    asset_count: 512,
    avg_risk: 'MEDIUM',
    inference_count: 14,
    created_at: '2025-09-10T14:00:00Z',
  },
  {
    id: 'proj-004',
    name: 'DD CPFL Renováveis Eólica Sul',
    target_company: 'CPFL Renováveis — Parque Eólico Sul',
    status: 'ingesting',
    seller_price: 310000000,
    passivo_total_ajustado: null,
    asset_count: 0,
    avg_risk: '-',
    inference_count: 0,
    created_at: '2026-03-07T16:45:00Z',
  },
];

export const mockAssets: Asset[] = [
  { id: 'ast-001', project_id: 'proj-001', codigo: 'TR-2018-042', tipo: 'transformador', fabricante: 'ABB', modelo: 'KTRT 500kV', numero_serie: 'ABB-2018-42901', data_aquisicao: '2018-03-15', capex_original: 12500000, capex_corrigido: 16875000, vida_util_contratada_anos: 30, vida_util_restante_anos: 22.3, depreciacao_aneel_pct: 26.7, depreciacao_fisica_pct: 34.2, valor_atual: 11109375, risk_score: 'CRITICAL', timeline_coverage_pct: 58, conformidade_score: 0.62 },
  { id: 'ast-002', project_id: 'proj-001', codigo: 'TR-2018-087', tipo: 'transformador', fabricante: 'Siemens', modelo: 'TLSN 230kV', numero_serie: 'SIE-2018-87443', data_aquisicao: '2018-06-22', capex_original: 8200000, capex_corrigido: 11070000, vida_util_contratada_anos: 30, vida_util_restante_anos: 24.1, depreciacao_aneel_pct: 26.7, depreciacao_fisica_pct: 22.8, valor_atual: 8541900, risk_score: 'LOW', timeline_coverage_pct: 92, conformidade_score: 0.95 },
  { id: 'ast-003', project_id: 'proj-001', codigo: 'DJ-2015-014', tipo: 'disjuntor', fabricante: 'ABB', modelo: 'LTB 362kV', numero_serie: 'ABB-2015-14002', data_aquisicao: '2015-01-10', capex_original: 3400000, capex_corrigido: 5270000, vida_util_contratada_anos: 25, vida_util_restante_anos: 14.0, depreciacao_aneel_pct: 44.0, depreciacao_fisica_pct: 48.5, valor_atual: 2714050, risk_score: 'HIGH', timeline_coverage_pct: 71, conformidade_score: 0.78 },
  { id: 'ast-004', project_id: 'proj-001', codigo: 'TR-2020-103', tipo: 'transformador', fabricante: 'WEG', modelo: 'UTC 138kV', numero_serie: 'WEG-2020-10312', data_aquisicao: '2020-09-05', capex_original: 5800000, capex_corrigido: 7250000, vida_util_contratada_anos: 30, vida_util_restante_anos: 26.5, depreciacao_aneel_pct: 20.0, depreciacao_fisica_pct: 15.3, valor_atual: 6141250, risk_score: 'LOW', timeline_coverage_pct: 95, conformidade_score: 0.97 },
  { id: 'ast-005', project_id: 'proj-001', codigo: 'TW-2016-221', tipo: 'torre', fabricante: 'SAE Towers', modelo: 'Autoportante 500kV', numero_serie: 'SAE-2016-22100', data_aquisicao: '2016-04-18', capex_original: 890000, capex_corrigido: 1290500, vida_util_contratada_anos: 40, vida_util_restante_anos: 30.1, depreciacao_aneel_pct: 25.0, depreciacao_fisica_pct: 20.8, valor_atual: 1022295, risk_score: 'MEDIUM', timeline_coverage_pct: 82, conformidade_score: 0.85 },
  { id: 'ast-006', project_id: 'proj-001', codigo: 'CB-2017-055', tipo: 'cabo', fabricante: 'Nexans', modelo: 'ACSR 795 MCM', numero_serie: 'NEX-2017-05500', data_aquisicao: '2017-11-30', capex_original: 2100000, capex_corrigido: 2940000, vida_util_contratada_anos: 35, vida_util_restante_anos: 26.2, depreciacao_aneel_pct: 25.7, depreciacao_fisica_pct: 18.4, valor_atual: 2398860, risk_score: 'LOW', timeline_coverage_pct: 88, conformidade_score: 0.91 },
];

export const mockInferencesGIE: InferenceGIE[] = [
  { id: 'gie-1', project_id: 'proj-001', asset_id: null, inference_id: 'INF-M1', title: 'Score de Risco Global', level: 'CRITICAL', impact_value: -23500000, finding: '3 transformadores de 500kV apresentam score CRITICAL — combinação de documentação incompleta (< 60%) com histórico de falhas não resolvidas em 2022-2023.', recommendation: 'Solicitar laudo físico independente antes de fechar o preço de aquisição.', source_documents: [{ doc_name: 'NF-2019-0112', page: 2, excerpt: 'Transformador ABB KTRT 500kV' }, { doc_name: 'Laudo-2023-04', page: 7, excerpt: 'Falha não resolvida' }], confidence_score: 0.94 },
  { id: 'gie-2', project_id: 'proj-001', asset_id: null, inference_id: 'INF-M2', title: 'Concentração de Fabricante', level: 'HIGH', impact_value: -8200000, finding: 'ABB representa 62% do valor do parque — risco de supply chain e negociação de spare parts.', recommendation: 'Negociar contrato de manutenção pré-closing com ABB ou provisionar R$ 8.2M para diversificação.', source_documents: [{ doc_name: 'Inventário-Consolidado', page: 1, excerpt: '62% ABB' }], confidence_score: 0.91 },
  { id: 'gie-3', project_id: 'proj-001', asset_id: null, inference_id: 'INF-M3', title: 'Passivo Oculto', level: 'CRITICAL', impact_value: -18000000, finding: 'R$ 18M em passivos não declarados identificados via cruzamento de laudos com histórico de penalidades ANEEL.', recommendation: 'Incluir cláusula de indemnity específica para passivos regulatórios não declarados.', source_documents: [{ doc_name: 'Eventos_Operacionais_2022', page: 14, excerpt: 'Penalidade ANEEL' }], confidence_score: 0.88 },
  { id: 'gie-4', project_id: 'proj-001', asset_id: null, inference_id: 'INF-M4', title: 'Vida Útil Residual Ajustada', level: 'MEDIUM', impact_value: -5600000, finding: 'Depreciação física excede ANEEL em média 7.2pp — 42 ativos com vida útil real estimada inferior à contratada.', recommendation: 'Ajustar projeção de CAPEX de reposição nos próximos 10 anos.', source_documents: [{ doc_name: 'Laudos-Consolidados', page: 3, excerpt: 'Depreciação física' }], confidence_score: 0.86 },
  { id: 'gie-5', project_id: 'proj-001', asset_id: null, inference_id: 'INF-M5', title: 'Custo de Adequação Regulatória', level: 'HIGH', impact_value: -8500000, finding: 'R$ 8.5M necessários para adequar 18 ativos às normas ANEEL vigentes — divergências em especificações instaladas vs. contratadas.', recommendation: 'Incluir como desconto no preço ou exigir adequação pré-closing.', source_documents: [{ doc_name: 'Edital-Original', page: 8, excerpt: 'Especificações contratadas' }], confidence_score: 0.92 },
  { id: 'gie-6', project_id: 'proj-001', asset_id: null, inference_id: 'INF-M6', title: 'Projeção de OPEX Manutenção', level: 'MEDIUM', impact_value: -3200000, finding: 'Custo de manutenção projetado 18% acima do declarado pelo vendedor — baseado em intervalos reais vs. recomendados pelo fabricante.', recommendation: 'Renegociar OPEX projetado no modelo financeiro.', source_documents: [{ doc_name: 'Manual-ABB-KTRT', page: 22, excerpt: 'Intervalo manutenção' }], confidence_score: 0.84 },
  { id: 'gie-7', project_id: 'proj-001', asset_id: null, inference_id: 'INF-M7', title: 'Desconto por Lacunas Documentais', level: 'HIGH', impact_value: -4200000, finding: '23% do parque possui cobertura documental < 70% — impossibilidade de garantir estado real dos ativos.', recommendation: 'Aplicar desconto de 15% sobre valor dos ativos sem documentação adequada.', source_documents: [{ doc_name: 'Quality-Score-Report', page: 1, excerpt: 'Cobertura < 70%' }], confidence_score: 0.90 },
  { id: 'gie-8', project_id: 'proj-001', asset_id: null, inference_id: 'INF-M8', title: 'Ajuste RAB Positivo', level: 'LOW', impact_value: 2300000, finding: 'R$ 2.3M em ativos subavaliados na base RAB do vendedor — melhorias não contabilizadas em 2021-2022.', recommendation: 'Considerar como upside na negociação.', source_documents: [{ doc_name: 'NF-2021-0204', page: 1, excerpt: 'Melhorias capitalizáveis' }], confidence_score: 0.87 },
];

export const mockInferencesATGI: InferenceATGI[] = [
  { id: 'atgi-1', project_id: 'proj-001', asset_id: 'ast-001', inference_id: 'INF-T1', title: 'Score de Cobertura Timeline', gap_type: null, value: 0.58, finding: 'Cobertura documental de apenas 58% — lacunas significativas na camada de manutenção entre 2020-2023.' },
  { id: 'atgi-2', project_id: 'proj-001', asset_id: 'ast-001', inference_id: 'INF-T2', title: 'Score de Conformidade', gap_type: null, value: 0.62, finding: 'Conformidade de 62% — desvios de especificação detectados entre edital e as-built.' },
  { id: 'atgi-3', project_id: 'proj-001', asset_id: 'ast-001', inference_id: 'INF-T3', title: 'Gaps Temporais Detectados', gap_type: 'TIPO_2', value: 3, finding: '3 gaps temporais na camada de manutenção — períodos sem registro de inspeção.' },
  { id: 'atgi-4', project_id: 'proj-001', asset_id: 'ast-001', inference_id: 'INF-T4', title: 'Probabilidade de Falha Iminente', gap_type: null, value: 0.42, finding: 'Probabilidade de 42% de falha nos próximos 24 meses — baseado em padrão de degradação e gaps de manutenção.' },
  { id: 'atgi-5', project_id: 'proj-001', asset_id: 'ast-001', inference_id: 'INF-T5', title: 'Passivo Regulatório', gap_type: 'TIPO_3', value: 850000, finding: 'Penalidade ANEEL 2022 sem laudo de resolução — passivo regulatório estimado em R$ 850.000.' },
  { id: 'atgi-6', project_id: 'proj-001', asset_id: 'ast-001', inference_id: 'INF-T6', title: 'Custo de Remediação', gap_type: 'TIPO_1', value: 2400000, finding: 'R$ 2.4M estimados para adequar especificações instaladas às contratadas no edital original.' },
];

export const mockTimelineEvents: TimelineEvent[] = [
  { id: 'te-1', asset_id: 'ast-001', layer: 'edital', event_date: '2017-06-01', event_type: 'especificacao', description: 'Especificação contratada: Transformador 500kV ABB KTRT', has_resolution: true, gap_type: null },
  { id: 'te-2', asset_id: 'ast-001', layer: 'as_built', event_date: '2018-03-15', event_type: 'instalacao_componente', description: 'Instalado: ABB KTRT → Siemens TLSN ⚠ Desvio de especificação', has_resolution: false, gap_type: 'TIPO_1' },
  { id: 'te-3', asset_id: 'ast-001', layer: 'manutencao', event_date: '2019-01-20', event_type: 'inspecao', description: 'Inspeção de rotina — sem anomalias', has_resolution: true, gap_type: null },
  { id: 'te-4', asset_id: 'ast-001', layer: 'manutencao', event_date: '2019-08-14', event_type: 'substituicao', description: 'Substituição de buchas — componente degradado', has_resolution: true, gap_type: null },
  { id: 'te-5', asset_id: 'ast-001', layer: 'operacional', event_date: '2020-11-03', event_type: 'falha', description: 'Desligamento de emergência — sobrecarga', has_resolution: true, gap_type: null },
  { id: 'te-6', asset_id: 'ast-001', layer: 'manutencao', event_date: '2021-03-10', event_type: 'inspecao', description: 'Inspeção pós-falha — anomalias detectadas', has_resolution: true, gap_type: null },
  { id: 'te-7', asset_id: 'ast-001', layer: 'operacional', event_date: '2022-08-15', event_type: 'penalidade_aneel', description: 'Penalidade ANEEL Nº 0842/2022 — SEM LAUDO DE RESOLUÇÃO', has_resolution: false, gap_type: 'TIPO_3' },
  { id: 'te-8', asset_id: 'ast-001', layer: 'manutencao', event_date: '2024-06-20', event_type: 'inspecao', description: 'Inspeção recente — manutenção em dia', has_resolution: true, gap_type: null },
];

export const mockPassivo: PassivoAjustado = {
  seller_price: 850000000,
  ajuste_tipo1: 42000000,
  ajuste_tipo2: 18000000,
  ajuste_tipo3: 8500000,
  ajuste_tipo4: 19000000,
  passivo_oculto_gie: 18000000,
  passivo_regulatorio: 12000000,
  passivo_total_ajustado: 759000000,
  delta_absoluto: 91000000,
  delta_pct: 10.7,
};

export const mockPipelineSteps: PipelineStep[] = [
  { id: 'M-01', label: 'OCR Semântico', status: 'done', duration: '4m 23s' },
  { id: 'M-02', label: 'RAG Indexação', status: 'done', duration: '2m 11s' },
  { id: 'M-03', label: 'Motor de Valoração', status: 'done', duration: '1m 45s' },
  { id: 'M-04', label: 'Inferências GIE', status: 'done', duration: '3m 08s' },
  { id: 'M-05', label: 'Pipeline ATGI', status: 'done', duration: '2m 54s' },
];

export const mockRagMessages: RagMessage[] = [
  { id: 'msg-1', role: 'user', content: 'Qual o histórico de falhas críticas dos transformadores listados nas NFs de 2018?' },
  { id: 'msg-2', role: 'assistant', content: 'Identifiquei 3 transformadores adquiridos em 2018 com histórico de falhas:\n\n1. **TR-2018-042** (ABB, 500kV) — 2 falhas críticas (2021, 2023). Última: desligamento de emergência em Jun/2023, sem laudo de resolução.\n\n2. **TR-2018-087** (Siemens, 230kV) — 1 falha menor (2020), resolvida.\n\n3. **TR-2018-091** (WEG, 138kV) — sem falhas registradas, manutenção em dia.', sources: [{ doc_name: 'NF-2018-0042', page: 3 }, { doc_name: 'Laudo-Inspecao-2023-06.pdf', page: 7 }, { doc_name: 'OS-2020-114.pdf', page: 2 }], confidence: 0.96, needs_human_review: false },
];
