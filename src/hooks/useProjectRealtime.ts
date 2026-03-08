import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to realtime changes on the projects and documents tables
 * for a specific project, and automatically invalidates react-query caches.
 */
export const useProjectRealtime = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['project', projectId] });
          queryClient.invalidateQueries({ queryKey: ['projects'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);
};
