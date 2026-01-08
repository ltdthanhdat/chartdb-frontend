import type { Diagram } from '@/lib/domain/diagram';
import type { DatabaseType } from '@/lib/domain/database-type';
import type { DatabaseEdition } from '@/lib/domain/database-edition';
import type { Cardinality } from '@/lib/domain/db-relationship';
import type {
    DBCustomTypeField,
    DBCustomTypeKind,
} from '@/lib/domain/db-custom-type';

export interface SyncConfig {
    apiUrl: string;
    enabled: boolean;
}

export interface PushRequest {
    diagram: Diagram;
}

export interface PushResponse {
    success: boolean;
    diagram_id: string;
}

export interface PullResponse extends Diagram {}

export interface DiagramListItem {
    id: string;
    name: string;
    databaseType: string;
    databaseEdition?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface BackendDiagramResponse {
    id: string;
    name: string;
    databaseType: string;
    databaseEdition?: string;
    createdAt: string;
    updatedAt: string;
    tables?: BackendTable[];
    relationships?: BackendRelationship[];
    dependencies?: BackendDependency[];
    areas?: BackendArea[];
    customTypes?: BackendCustomType[];
    notes?: BackendNote[];
}

interface BackendTable {
    id: string;
    name: string;
    schema?: string;
    x: number;
    y: number;
    color: string;
    isView: boolean;
    createdAt?: number;
    fields: BackendField[];
    indexes?: BackendIndex[];
    comments?: string;
}

interface BackendField {
    id: string;
    name: string;
    type: string | { id: string; name: string };
    primaryKey: boolean;
    unique: boolean;
    nullable: boolean;
    createdAt?: number;
    check?: string;
    default?: string;
    collation?: string;
    comments?: string;
}

interface BackendIndex {
    id: string;
    name: string;
    unique: boolean;
    fieldIds: string[];
}

interface BackendRelationship {
    id: string;
    name: string;
    sourceTableId: string;
    targetTableId: string;
    sourceFieldId: string;
    targetFieldId: string;
    sourceCardinality: string;
    targetCardinality: string;
    createdAt?: number;
}

interface BackendDependency {
    id: string;
    tableId: string;
    dependentTableId: string;
    createdAt?: number;
}

interface BackendArea {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}

interface BackendCustomType {
    id: string;
    name: string;
    schema?: string;
    kind: string;
    fields: DBCustomTypeField[] | null;
}

interface BackendNote {
    id: string;
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}

export class SyncService {
    private config: SyncConfig;

    constructor(config: SyncConfig) {
        this.config = config;
    }

    get isEnabled(): boolean {
        return this.config.enabled && !!this.config.apiUrl;
    }

    async push(diagram: Diagram): Promise<PushResponse> {
        if (!this.isEnabled) {
            throw new Error('Sync service is not enabled');
        }

        const response = await fetch(`${this.config.apiUrl}/api/sync/push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                diagram: this.serializeDiagram(diagram),
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({
                error: `HTTP ${response.status}: ${response.statusText}`,
            }));
            throw new Error(error.error || 'Failed to push diagram');
        }

        return response.json();
    }

    async pull(diagramId: string): Promise<PullResponse | null> {
        if (!this.isEnabled) {
            throw new Error('Sync service is not enabled');
        }

        const response = await fetch(
            `${this.config.apiUrl}/api/sync/pull/${diagramId}`
        );

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({
                error: `HTTP ${response.status}: ${response.statusText}`,
            }));
            throw new Error(error.error || 'Failed to pull diagram');
        }

        const data = await response.json();
        return this.deserializeDiagram(data);
    }

    async listDiagrams(): Promise<DiagramListItem[]> {
        if (!this.isEnabled) {
            throw new Error('Sync service is not enabled');
        }

        const response = await fetch(`${this.config.apiUrl}/api/sync/diagrams`);

        if (!response.ok) {
            const error = await response.json().catch(() => ({
                error: `HTTP ${response.status}: ${response.statusText}`,
            }));
            throw new Error(error.error || 'Failed to list diagrams');
        }

        const diagrams = (await response.json()) as Array<{
            id: string;
            name: string;
            database_type: string;
            database_edition?: string;
            created_at: string;
            updated_at: string;
        }>;
        return diagrams.map((d) => ({
            id: d.id,
            name: d.name,
            databaseType: d.database_type,
            databaseEdition: d.database_edition,
            createdAt: new Date(d.created_at),
            updatedAt: new Date(d.updated_at),
        }));
    }

    async healthCheck(): Promise<boolean> {
        if (!this.isEnabled) {
            return false;
        }

        try {
            const response = await fetch(`${this.config.apiUrl}/health`, {
                method: 'GET',
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    private serializeDiagram(diagram: Diagram): unknown {
        return {
            id: diagram.id,
            name: diagram.name,
            databaseType: diagram.databaseType,
            databaseEdition: diagram.databaseEdition,
            createdAt: diagram.createdAt.toISOString(),
            updatedAt: diagram.updatedAt.toISOString(),
            tables: diagram.tables?.map((t) => ({
                id: t.id,
                diagramId: diagram.id,
                name: t.name,
                schema: t.schema,
                x: t.x,
                y: t.y,
                color: t.color,
                isView: t.isView,
                fields: t.fields,
                indexes: t.indexes,
                comments: t.comments,
            })),
            relationships: diagram.relationships?.map((r) => ({
                id: r.id,
                diagramId: diagram.id,
                name: r.name,
                sourceTableId: r.sourceTableId,
                targetTableId: r.targetTableId,
                sourceFieldId: r.sourceFieldId,
                targetFieldId: r.targetFieldId,
                sourceCardinality: r.sourceCardinality,
                targetCardinality: r.targetCardinality,
            })),
            dependencies: diagram.dependencies?.map((d) => ({
                id: d.id,
                diagramId: diagram.id,
                tableId: d.tableId,
                dependentTableId: d.dependentTableId,
            })),
            areas: diagram.areas?.map((a) => ({
                id: a.id,
                diagramId: diagram.id,
                name: a.name,
                x: a.x,
                y: a.y,
                width: a.width,
                height: a.height,
                color: a.color,
            })),
            customTypes: diagram.customTypes?.map((ct) => ({
                id: ct.id,
                diagramId: diagram.id,
                name: ct.name,
                schema: ct.schema,
                kind: ct.kind,
                fields: ct.fields,
            })),
            notes: diagram.notes?.map((n) => ({
                id: n.id,
                diagramId: diagram.id,
                content: n.content,
                x: n.x,
                y: n.y,
                width: n.width,
                height: n.height,
                color: n.color,
            })),
        };
    }

    private deserializeDiagram(data: BackendDiagramResponse): Diagram {
        return {
            id: data.id,
            name: data.name,
            databaseType: data.databaseType as DatabaseType,
            databaseEdition: data.databaseEdition as
                | DatabaseEdition
                | undefined,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
            tables: data.tables?.map((t) => ({
                id: t.id,
                name: t.name,
                schema: t.schema,
                x: t.x,
                y: t.y,
                color: t.color,
                isView: t.isView,
                createdAt: t.createdAt || Date.now(),
                fields: t.fields.map((f) => {
                    const fieldType =
                        typeof f.type === 'string'
                            ? {
                                  id: f.type.toLowerCase().replace(/\s+/g, '_'),
                                  name: f.type,
                              }
                            : f.type;
                    return {
                        id: f.id,
                        name: f.name,
                        type: fieldType,
                        primaryKey: f.primaryKey,
                        unique: f.unique,
                        nullable: f.nullable,
                        createdAt: f.createdAt || Date.now(),
                        check: f.check,
                        default: f.default,
                        collation: f.collation,
                        comments: f.comments,
                    };
                }),
                indexes:
                    t.indexes?.map((i) => ({
                        id: i.id,
                        name: i.name,
                        unique: i.unique,
                        fieldIds: i.fieldIds,
                        createdAt: Date.now(),
                    })) || [],
                comments: t.comments,
            })),
            relationships: data.relationships?.map((r) => ({
                id: r.id,
                name: r.name,
                sourceTableId: r.sourceTableId,
                targetTableId: r.targetTableId,
                sourceFieldId: r.sourceFieldId,
                targetFieldId: r.targetFieldId,
                sourceCardinality: r.sourceCardinality as Cardinality,
                targetCardinality: r.targetCardinality as Cardinality,
                createdAt: r.createdAt || Date.now(),
            })),
            dependencies: data.dependencies?.map((d) => ({
                id: d.id,
                tableId: d.tableId,
                dependentTableId: d.dependentTableId,
                createdAt: d.createdAt || Date.now(),
            })),
            areas: data.areas?.map((a) => ({
                id: a.id,
                name: a.name,
                x: a.x,
                y: a.y,
                width: a.width,
                height: a.height,
                color: a.color,
            })),
            customTypes: data.customTypes?.map((ct) => ({
                id: ct.id,
                name: ct.name,
                schema: ct.schema,
                kind: ct.kind as DBCustomTypeKind,
                fields: ct.fields,
            })),
            notes: data.notes?.map((n) => ({
                id: n.id,
                content: n.content,
                x: n.x,
                y: n.y,
                width: n.width,
                height: n.height,
                color: n.color,
            })),
        };
    }
}

let syncServiceInstance: SyncService | null = null;

export function initSyncService(config: SyncConfig): SyncService {
    syncServiceInstance = new SyncService(config);
    return syncServiceInstance;
}

export function getSyncService(): SyncService | null {
    return syncServiceInstance;
}
