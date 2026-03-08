import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

export const useProjects = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

export const useProjectAssets = (projectId: string) => {
  return useQuery({
    queryKey: ['assets', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
};

export const useProjectInferencesGIE = (projectId: string) => {
  return useQuery({
    queryKey: ['inferences_gie', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inferences_gie')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
};

export const useProjectInferencesATGI = (projectId: string) => {
  return useQuery({
    queryKey: ['inferences_atgi', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inferences_atgi')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
};

export const useProjectPassivo = (projectId: string) => {
  return useQuery({
    queryKey: ['passivo', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('passivo_ajustado')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
};

export const useProjectDocuments = (projectId: string) => {
  return useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
};

export const useAssetTimeline = (assetId: string | undefined) => {
  return useQuery({
    queryKey: ['timeline', assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_timeline_events')
        .select('*')
        .eq('asset_id', assetId!)
        .order('event_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!assetId,
  });
};

export const useProjectRagMessages = (projectId: string) => {
  return useQuery({
    queryKey: ['rag_messages', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rag_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
};

export const useGlobalStats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['global_stats', user?.id],
    queryFn: async () => {
      const [projectsRes, assetsRes, gieRes] = await Promise.all([
        supabase.from('projects').select('id, seller_price, passivo_total_ajustado'),
        supabase.from('assets').select('id', { count: 'exact', head: true }),
        supabase.from('inferences_gie').select('id', { count: 'exact', head: true }),
      ]);

      const projects = projectsRes.data ?? [];
      const passivoTotal = projects.reduce((sum, p) => {
        if (p.seller_price && p.passivo_total_ajustado) {
          return sum + (p.seller_price - p.passivo_total_ajustado);
        }
        return sum;
      }, 0);

      return {
        projectCount: projects.length,
        assetCount: assetsRes.count ?? 0,
        inferenceCount: gieRes.count ?? 0,
        passivoTotal,
      };
    },
    enabled: !!user,
  });
};
