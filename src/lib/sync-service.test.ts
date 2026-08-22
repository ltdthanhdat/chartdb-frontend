import { afterEach, describe, expect, it, vi } from 'vitest';
import { SyncService } from './sync-service';

describe('SyncService.listDiagrams', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('maps the backend diagram metadata fields into the frontend model', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify([
                        {
                            id: 'diagram-1',
                            name: 'Orders',
                            databaseType: 'postgresql',
                            databaseEdition: null,
                            createdAt: '2026-08-22T18:08:43.641Z',
                            updatedAt: '2026-08-22T18:09:01.706Z',
                        },
                    ]),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    }
                )
            )
        );

        const diagrams = await new SyncService({
            apiUrl: 'http://localhost:3000',
            enabled: true,
        }).listDiagrams();

        expect(diagrams).toEqual([
            {
                id: 'diagram-1',
                name: 'Orders',
                databaseType: 'postgresql',
                databaseEdition: null,
                createdAt: new Date('2026-08-22T18:08:43.641Z'),
                updatedAt: new Date('2026-08-22T18:09:01.706Z'),
            },
        ]);
    });
});
