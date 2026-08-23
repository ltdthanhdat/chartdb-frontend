import type { DatabaseEdition } from '@/lib/domain/database-edition';
import type { DatabaseType } from '@/lib/domain/database-type';
import type { Diagram } from '@/lib/domain/diagram';
import type { DiagramListItem } from './sync-service';

interface MergeRemoteDiagramMetadataOptions {
    remoteDiagrams: DiagramListItem[];
    localDiagramIds: Set<string>;
    addDiagram: (params: { diagram: Diagram }) => Promise<void>;
}

export const mergeRemoteDiagramMetadata = async ({
    remoteDiagrams,
    localDiagramIds,
    addDiagram,
}: MergeRemoteDiagramMetadataOptions): Promise<void> => {
    for (const remote of remoteDiagrams) {
        if (localDiagramIds.has(remote.id)) {
            continue;
        }

        await addDiagram({
            diagram: {
                id: remote.id,
                name: remote.name,
                databaseType: remote.databaseType as DatabaseType,
                databaseEdition: remote.databaseEdition as
                    | DatabaseEdition
                    | undefined,
                createdAt: remote.createdAt,
                updatedAt: remote.updatedAt,
            },
        });
        localDiagramIds.add(remote.id);
    }
};
