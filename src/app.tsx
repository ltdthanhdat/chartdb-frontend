import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { TooltipProvider } from './components/tooltip/tooltip';
import { HelmetData } from './helmet/helmet-data';
import { HelmetProvider } from 'react-helmet-async';
import { initSyncService } from './lib/sync-service';
import { SYNC_API_URL } from './lib/env';

export const App = () => {
    useEffect(() => {
        const syncEnabled = !!SYNC_API_URL;

        initSyncService({
            apiUrl: SYNC_API_URL,
            enabled: syncEnabled,
        });

        if (syncEnabled) {
            console.log('🔄 Sync service initialized:', SYNC_API_URL);
        } else {
            console.log('ℹ️ Sync service disabled (no API URL configured)');
        }
    }, []);

    return (
        <HelmetProvider>
            <HelmetData />
            <TooltipProvider>
                <RouterProvider router={router} />
            </TooltipProvider>
        </HelmetProvider>
    );
};
