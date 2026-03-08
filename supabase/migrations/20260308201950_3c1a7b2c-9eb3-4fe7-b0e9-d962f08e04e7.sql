
-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  target_company text NOT NULL,
  seller_price numeric,
  status text DEFAULT 'uploading',
  kpi_ocr_precision numeric,
  kpi_dd_reduction numeric,
  kpi_gie_accuracy numeric,
  kpi_atgi_coverage numeric,
  passivo_total_ajustado numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  filename text NOT NULL,
  file_path text,
  status text DEFAULT 'queued',
  ocr_result jsonb,
  page_count int,
  quality_score numeric,
  error_msg text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = documents.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can create own documents" ON public.documents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = documents.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = documents.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = documents.project_id AND projects.user_id = auth.uid())
);

-- Assets
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  codigo text,
  tipo text,
  fabricante text,
  modelo text,
  numero_serie text,
  data_aquisicao date,
  capex_original numeric,
  capex_corrigido_ipca numeric,
  vida_util_contratada_anos numeric,
  vida_util_restante_anos numeric,
  depreciacao_aneel_pct numeric,
  depreciacao_fisica_pct numeric,
  valor_atual numeric,
  risk_score text DEFAULT 'LOW',
  timeline_coverage_pct numeric,
  conformidade_score numeric,
  source_documents jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own assets" ON public.assets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = assets.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can create own assets" ON public.assets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = assets.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update own assets" ON public.assets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = assets.project_id AND projects.user_id = auth.uid())
);

-- Inferences GIE
CREATE TABLE public.inferences_gie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  asset_id uuid REFERENCES public.assets,
  inference_id text NOT NULL,
  title text NOT NULL,
  level text NOT NULL,
  impact_value numeric,
  finding text,
  recommendation text,
  source_documents jsonb,
  confidence_score numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.inferences_gie ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own GIE inferences" ON public.inferences_gie FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = inferences_gie.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can create own GIE inferences" ON public.inferences_gie FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = inferences_gie.project_id AND projects.user_id = auth.uid())
);

-- Inferences ATGI
CREATE TABLE public.inferences_atgi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  asset_id uuid REFERENCES public.assets,
  inference_id text NOT NULL,
  title text NOT NULL,
  gap_type text,
  value numeric,
  finding text,
  source_documents jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.inferences_atgi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ATGI inferences" ON public.inferences_atgi FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = inferences_atgi.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can create own ATGI inferences" ON public.inferences_atgi FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = inferences_atgi.project_id AND projects.user_id = auth.uid())
);

-- Asset Timeline Events
CREATE TABLE public.asset_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.assets ON DELETE CASCADE NOT NULL,
  layer text NOT NULL,
  event_date date,
  event_type text,
  description text,
  has_resolution boolean DEFAULT true,
  gap_type text,
  impact_value numeric,
  source_doc_id uuid REFERENCES public.documents,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.asset_timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own timeline events" ON public.asset_timeline_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.assets JOIN public.projects ON projects.id = assets.project_id WHERE assets.id = asset_timeline_events.asset_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can create own timeline events" ON public.asset_timeline_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.assets JOIN public.projects ON projects.id = assets.project_id WHERE assets.id = asset_timeline_events.asset_id AND projects.user_id = auth.uid())
);

-- Passivo Ajustado
CREATE TABLE public.passivo_ajustado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects ON DELETE CASCADE UNIQUE NOT NULL,
  seller_price numeric,
  ajuste_tipo1 numeric DEFAULT 0,
  ajuste_tipo2 numeric DEFAULT 0,
  ajuste_tipo3 numeric DEFAULT 0,
  ajuste_tipo4 numeric DEFAULT 0,
  passivo_oculto_gie numeric DEFAULT 0,
  passivo_regulatorio numeric DEFAULT 0,
  passivo_total_ajustado numeric,
  delta_absoluto numeric,
  delta_pct numeric,
  calculated_at timestamptz DEFAULT now()
);

ALTER TABLE public.passivo_ajustado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own passivo" ON public.passivo_ajustado FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = passivo_ajustado.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can create own passivo" ON public.passivo_ajustado FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = passivo_ajustado.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update own passivo" ON public.passivo_ajustado FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = passivo_ajustado.project_id AND projects.user_id = auth.uid())
);

-- RAG Messages
CREATE TABLE public.rag_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  sources jsonb,
  confidence numeric,
  needs_human_review boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.rag_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own RAG messages" ON public.rag_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = rag_messages.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can create own RAG messages" ON public.rag_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = rag_messages.project_id AND projects.user_id = auth.uid())
);

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

CREATE POLICY "Users can upload documents" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND auth.uid() IS NOT NULL
);
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND auth.uid() IS NOT NULL
);
