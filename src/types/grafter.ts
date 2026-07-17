export interface Project {
  id: string;
  name: string;
  target_company: string;
  status: 'ingesting' | 'processing' | 'ready' | 'complete';
  seller_price: number;
  passivo_total_ajustado: number | null;
  asset_count: number;
  avg_risk: string;
  inference_count: number;
  created_at: string;
  achados_count?: number;
  gaps_count?: number;
  cobertura_documental_pct?: number;
  achados_severity?: { critical: number; major: number; minor: number };
  gaps_by_type?: { tipo1: number; tipo2: number; tipo3: number; tipo4: number };
  human_review_pending?: number;
}

export interface Asset {
  id: string;
  project_id: string;
  codigo: string;
  tipo: string;
  fabricante: string;
  modelo: string;
  numero_serie: string;
  data_aquisicao: string;
  capex_original: number;
  capex_corrigido: number;
  vida_util_contratada_anos: number;
  vida_util_restante_anos: number;
  depreciacao_aneel_pct: number;
  depreciacao_fisica_pct: number;
  valor_atual: number;
  risk_score: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeline_coverage_pct: number;
  conformidade_score: number;
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
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impact_value: number;
  finding: string;
  recommendation: string;
  source_documents: SourceDocument[];
  confidence_score: number;
  // New technical fields
  methodology?: string;
  regulatory_basis?: string;
  affected_assets?: number;
  sensitivity?: SensitivityRange[];
  calculation_memo?: string;
  cross_references?: string[];
  validation_status?: 'validated' | 'pending_review' | 'requires_field_inspection';
}

export interface InferenceATGI {
  id: string;
  project_id: string;
  asset_id: string;
  inference_id: string;
  title: string;
  gap_type: string | null;
  value: number;
  finding: string;
  // New technical fields
  methodology?: string;
  regulatory_basis?: string;
  severity?: 'critical' | 'major' | 'minor' | 'observation';
  remediation_cost?: number;
  remediation_timeline?: string;
  affected_period?: { start: string; end: string };
  source_documents?: SourceDocument[];
  cross_references?: string[];
}

export interface TimelineEvent {
  id: string;
  asset_id: string;
  layer: 'edital' | 'as_built' | 'manutencao' | 'operacional';
  event_date: string;
  event_type: string;
  description: string;
  has_resolution: boolean;
  gap_type: string | null;
  // New fields
  impact_value?: number;
  source_doc?: string;
  severity?: 'critical' | 'major' | 'minor';
}

export interface PassivoAjustado {
  seller_price: number;
  ajuste_tipo1: number;
  ajuste_tipo2: number;
  ajuste_tipo3: number;
  ajuste_tipo4: number;
  passivo_oculto_gie: number;
  passivo_regulatorio: number;
  passivo_total_ajustado: number;
  delta_absoluto: number;
  delta_pct: number;
}

export interface RagMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { doc_name: string; page: number; confidence?: number }[];
  confidence?: number;
  needs_human_review?: boolean;
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
