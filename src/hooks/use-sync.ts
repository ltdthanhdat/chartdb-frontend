import { useCallback, useEffect, useRef } from 'react';
import { getSyncService } from '@/lib/sync-service';
import type { Diagram } from '@/lib/domain/diagram';
import { useDebounceFn } from 'ahooks';

export interface UseSyncOptions {
    enabled?: boolean;
    debounceMs?: number;
    onSyncSuccess?: (diagramId: string) => void;
    onSyncError?: (error: Error) => void;
}

export function useSync(options: UseSyncOptions = {}) {
    const {
        enabled = true,
        debounceMs = 2000,
        onSyncSuccess,
        onSyncError,
    } = options;

    const syncService = getSyncService();
    const isSyncingRef = useRef(false);
    const lastSyncedDiagramRef = useRef<string | null>(null);

    const pushDiagram = useCallback(
        async (diagram: Diagram) => {
            if (!syncService?.isEnabled || !enabled) {
                return;
            }

            if (isSyncingRef.current) {
                return;
            }

            try {
                isSyncingRef.current = true;
                const diagramJSON = JSON.stringify(diagram);

                if (lastSyncedDiagramRef.current === diagramJSON) {
                    return;
                }

                console.log('🔄 Syncing diagram to backend:', diagram.id);

                const response = await syncService.push(diagram);

                if (response.success) {
                    lastSyncedDiagramRef.current = diagramJSON;
                    console.log('✅ Diagram synced successfully:', diagram.id);
                    onSyncSuccess?.(diagram.id);
                }
            } catch (error) {
                console.error('❌ Failed to sync diagram:', error);
                onSyncError?.(error as Error);
            } finally {
                isSyncingRef.current = false;
            }
        },
        [syncService, enabled, onSyncSuccess, onSyncError]
    );

    const { run: debouncedPush } = useDebounceFn(pushDiagram, {
        wait: debounceMs,
    });

    const pullDiagram = useCallback(
        async (diagramId: string): Promise<Diagram | null> => {
            if (!syncService?.isEnabled || !enabled) {
                return null;
            }

            try {
                console.log('⬇️ Pulling diagram from backend:', diagramId);
                const diagram = await syncService.pull(diagramId);

                if (diagram) {
                    console.log('✅ Diagram pulled successfully:', diagramId);
                    lastSyncedDiagramRef.current = JSON.stringify(diagram);
                    return diagram;
                } else {
                    console.log('ℹ️ Diagram not found on server:', diagramId);
                    return null;
                }
            } catch (error) {
                console.error('❌ Failed to pull diagram:', error);
                onSyncError?.(error as Error);
                return null;
            }
        },
        [syncService, enabled, onSyncError]
    );

    const listDiagrams = useCallback(async () => {
        if (!syncService?.isEnabled || !enabled) {
            return [];
        }

        try {
            console.log('📋 Fetching diagram list from backend');
            const diagrams = await syncService.listDiagrams();
            console.log(`✅ Fetched ${diagrams.length} diagrams from backend`);
            return diagrams;
        } catch (error) {
            console.error('❌ Failed to list diagrams:', error);
            onSyncError?.(error as Error);
            return [];
        }
    }, [syncService, enabled, onSyncError]);

    const checkHealth = useCallback(async (): Promise<boolean> => {
        if (!syncService?.isEnabled) {
            return false;
        }

        try {
            const healthy = await syncService.healthCheck();
            if (healthy) {
                console.log('✅ Backend is healthy');
            } else {
                console.warn('⚠️ Backend health check failed');
            }
            return healthy;
        } catch (error) {
            console.error('❌ Backend health check error:', error);
            return false;
        }
    }, [syncService]);

    useEffect(() => {
        if (syncService?.isEnabled && enabled) {
            checkHealth();
        }
    }, [syncService, enabled, checkHealth]);

    useEffect(() => {
        if (!syncService?.isEnabled || !enabled) {
            return;
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isSyncingRef.current) {
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [syncService, enabled]);

    return {
        pushDiagram: debouncedPush,
        pushDiagramImmediate: pushDiagram,
        pullDiagram,
        listDiagrams,
        checkHealth,
        isEnabled: syncService?.isEnabled && enabled,
        isSyncing: isSyncingRef.current,
    };
}
