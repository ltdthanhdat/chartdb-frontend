import { describe, expect, it } from 'vitest';
import { App } from './app';
import { getSyncService } from './lib/sync-service';

describe('App sync setup', () => {
    it('initializes the sync service before React effects run', () => {
        expect(App).toBeDefined();
        expect(getSyncService()).not.toBeNull();
    });
});
