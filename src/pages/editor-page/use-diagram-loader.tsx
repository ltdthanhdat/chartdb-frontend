import { useChartDB } from '@/hooks/use-chartdb';
import { useConfig } from '@/hooks/use-config';
import { useDialog } from '@/hooks/use-dialog';
import { useFullScreenLoader } from '@/hooks/use-full-screen-spinner';
import { useRedoUndoStack } from '@/hooks/use-redo-undo-stack';
import { useStorage } from '@/hooks/use-storage';
import type { Diagram } from '@/lib/domain/diagram';
import type { DatabaseType } from '@/lib/domain/database-type';
import type { DatabaseEdition } from '@/lib/domain/database-edition';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSync } from '@/hooks/use-sync';

export const useDiagramLoader = () => {
    const [initialDiagram, setInitialDiagram] = useState<Diagram | undefined>();
    const { diagramId } = useParams<{ diagramId: string }>();
    const { config } = useConfig();
    const { loadDiagram, currentDiagram } = useChartDB();
    const { resetRedoStack, resetUndoStack } = useRedoUndoStack();
    const { showLoader, hideLoader } = useFullScreenLoader();
    const { openCreateDiagramDialog, openOpenDiagramDialog } = useDialog();
    const navigate = useNavigate();
    const { listDiagrams, addDiagram } = useStorage();
    const { listDiagrams: listRemoteDiagrams } = useSync();

    const currentDiagramLoadingRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!config) {
            return;
        }

        if (currentDiagram?.id === diagramId) {
            return;
        }

        const loadDefaultDiagram = async () => {
            if (diagramId) {
                setInitialDiagram(undefined);
                showLoader();
                resetRedoStack();
                resetUndoStack();
                const diagram = await loadDiagram(diagramId);
                if (!diagram) {
                    openOpenDiagramDialog({ canClose: false });
                    hideLoader();
                    return;
                }

                setInitialDiagram(diagram);
                hideLoader();

                return;
            } else if (!diagramId && config.defaultDiagramId) {
                const diagram = await loadDiagram(config.defaultDiagramId);
                if (diagram) {
                    navigate(`/diagrams/${config.defaultDiagramId}`);

                    return;
                }
            }

            try {
                const remoteDiagrams = await listRemoteDiagrams();
                if (remoteDiagrams.length > 0) {
                    console.log(
                        `📋 Found ${remoteDiagrams.length} diagrams on server`
                    );
                    const localDiagrams = await listDiagrams();
                    const localIds = new Set(
                        localDiagrams.map((d: Diagram) => d.id)
                    );

                    for (const remote of remoteDiagrams) {
                        if (!localIds.has(remote.id)) {
                            await addDiagram({
                                diagram: {
                                    id: remote.id,
                                    name: remote.name,
                                    databaseType:
                                        remote.databaseType as DatabaseType,
                                    databaseEdition: remote.databaseEdition as
                                        | DatabaseEdition
                                        | undefined,
                                    createdAt: remote.createdAt,
                                    updatedAt: remote.updatedAt,
                                },
                            });
                        }
                    }
                }
            } catch (error) {
                console.warn(
                    'Failed to sync diagram list from backend:',
                    error
                );
            }

            const diagrams = await listDiagrams();

            if (diagrams.length > 0) {
                openOpenDiagramDialog({ canClose: false });
            } else {
                openCreateDiagramDialog();
            }
        };

        if (
            currentDiagramLoadingRef.current === (diagramId ?? '') &&
            currentDiagramLoadingRef.current !== undefined
        ) {
            return;
        }
        currentDiagramLoadingRef.current = diagramId ?? '';

        loadDefaultDiagram();
    }, [
        diagramId,
        openCreateDiagramDialog,
        config,
        navigate,
        listDiagrams,
        loadDiagram,
        resetRedoStack,
        resetUndoStack,
        hideLoader,
        showLoader,
        currentDiagram?.id,
        openOpenDiagramDialog,
        addDiagram,
        listRemoteDiagrams,
    ]);

    return { initialDiagram };
};
