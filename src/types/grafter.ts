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
  source_documents: { doc_name: string; page: number; excerpt: string }[];
  confidence_score: number;
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
  sources?: { doc_name: string; page: number }[];
  confidence?: number;
  needs_human_review?: boolean;
}

export interface PipelineStep {
  id: string;
  label: string;
  status: 'done' | 'processing' | 'pending';
  duration?: string;
}
