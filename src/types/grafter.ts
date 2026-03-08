export interface Project {
  id: string;
  name: string;
  target_company: string;
  status: string;
  seller_price: number | null;
  passivo_total_ajustado: number | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string;
  kpi_ocr_precision: number | null;
  kpi_dd_reduction: number | null;
  kpi_gie_accuracy: number | null;
  kpi_atgi_coverage: number | null;
}

export interface Asset {
  id: string;
  project_id: string;
  codigo: string | null;
  tipo: string | null;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  data_aquisicao: string | null;
  capex_original: number | null;
  capex_corrigido_ipca: number | null;
  vida_util_contratada_anos: number | null;
  vida_util_restante_anos: number | null;
  depreciacao_aneel_pct: number | null;
  depreciacao_fisica_pct: number | null;
  valor_atual: number | null;
  risk_score: string | null;
  timeline_coverage_pct: number | null;
  conformidade_score: number | null;
  source_documents: any | null;
  created_at: string | null;
}

export interface SourceDocument {
  doc_name: string;
  page: number;
  excerpt: string;
  doc_type?: 'nota_fiscal' | 'laudo_tecnico' | 'edital' | 'relatorio_aneel' | 'ordem_servico' | 'manual' | 'contrato';
  confidence?: number;
}

export interface SensitivityRange {
  scenario: 'otimista' | 'base' | 'pessimista';
  value: number;
  probability: number;
}

export interface InferenceGIE {
  id: string;
  project_id: string;
  asset_id: string | null;
  inference_id: string;
  title: string;
  level: string;
  impact_value: number | null;
  finding: string | null;
  recommendation: string | null;
  source_documents: any | null;
  confidence_score: number | null;
  created_at: string | null;
}

export interface InferenceATGI {
  id: string;
  project_id: string;
  asset_id: string | null;
  inference_id: string;
  title: string;
  gap_type: string | null;
  value: number | null;
  finding: string | null;
  source_documents: any | null;
  created_at: string | null;
}

export interface TimelineEvent {
  id: string;
  asset_id: string;
  layer: string;
  event_date: string | null;
  event_type: string | null;
  description: string | null;
  has_resolution: boolean | null;
  gap_type: string | null;
  impact_value: number | null;
  source_doc_id: string | null;
  created_at: string | null;
}

export interface PassivoAjustado {
  id: string;
  project_id: string;
  seller_price: number | null;
  ajuste_tipo1: number | null;
  ajuste_tipo2: number | null;
  ajuste_tipo3: number | null;
  ajuste_tipo4: number | null;
  passivo_oculto_gie: number | null;
  passivo_regulatorio: number | null;
  passivo_total_ajustado: number | null;
  delta_absoluto: number | null;
  delta_pct: number | null;
  calculated_at: string | null;
}

export interface RagMessage {
  id: string;
  role: string;
  content: string;
  sources?: any | null;
  confidence?: number | null;
  needs_human_review?: boolean | null;
  project_id: string;
  created_at: string | null;
}

export interface PipelineStep {
  id: string;
  label: string;
  status: 'done' | 'processing' | 'pending';
  duration?: string;
}

export interface GapSummary {
  tipo: string;
  desc: string;
  ativos: number;
  impacto: number;
  regulatory_ref: string;
  severity: 'critical' | 'major' | 'minor';
  remediation_estimate: string;
}
