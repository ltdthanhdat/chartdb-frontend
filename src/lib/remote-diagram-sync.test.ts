import { describe, expect, it, vi } from 'vitest';
import type { DiagramListItem } from './sync-service';
import { mergeRemoteDiagramMetadata } from './remote-diagram-sync';

describe('mergeRemoteDiagramMetadata', () => {
    it('adds remote diagrams that are missing from local storage', async () => {
        const addDiagram = vi.fn().mockResolvedValue(undefined);
        const remoteDiagrams: DiagramListItem[] = [
            {
                id: 'phone-diagram',
                name: 'Phone diagram',
                databaseType: 'postgresql',
                databaseEdition: undefined,
                createdAt: new Date('2026-08-23T01:00:00.000Z'),
                updatedAt: new Date('2026-08-23T01:01:00.000Z'),
            },
            {
                id: 'already-local',
                name: 'Already local',
                databaseType: 'mysql',
                databaseEdition: undefined,
                createdAt: new Date('2026-08-23T01:00:00.000Z'),
                updatedAt: new Date('2026-08-23T01:01:00.000Z'),
            },
        ];

        await mergeRemoteDiagramMetadata({
            remoteDiagrams,
            localDiagramIds: new Set(['already-local']),
            addDiagram,
        });

        expect(addDiagram).toHaveBeenCalledTimes(1);
        expect(addDiagram).toHaveBeenCalledWith({
            diagram: {
                id: 'phone-diagram',
                name: 'Phone diagram',
                databaseType: 'postgresql',
                databaseEdition: undefined,
                createdAt: new Date('2026-08-23T01:00:00.000Z'),
                updatedAt: new Date('2026-08-23T01:01:00.000Z'),
            },
        });
    });
});
