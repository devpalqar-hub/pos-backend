import { readFileSync } from 'fs';
import { join } from 'path';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from '@jest/globals';
import { ToastService } from './toast.service';
import { ToastSyncStatus, ToastSyncType, UserRole } from '@prisma/client';

describe('ToastService', () => {
    let service: ToastService;
    let prisma: any;

    const superAdminActor = {
        id: 'user-1',
        role: UserRole.SUPER_ADMIN,
    } as any;

    const restaurantId = '2c229453-0625-4327-bb48-ed944b9c9989';

    const fixture = (name: string) => {
        const file = join(__dirname, '../../test/fixtures/toast', name);
        return JSON.parse(readFileSync(file, 'utf8'));
    };

    const mockFetchJson = (data: unknown, ok = true, status = 200) => {
        return {
            ok,
            status,
            json: async () => data,
            text: async () => JSON.stringify(data),
        };
    };

    beforeEach(() => {
        prisma = {
            restaurant: {
                findUnique: jest.fn(),
            },
            toastSettings: {
                findUnique: jest.fn(),
                upsert: jest.fn(),
                delete: jest.fn(),
            },
            toastSyncState: {
                upsert: jest.fn(),
                update: jest.fn(),
            },
            toastSyncLog: {
                create: jest.fn(),
                update: jest.fn(),
            },
            menuCategory: {
                upsert: jest.fn(),
            },
            toastMenuItemMapping: {
                findUnique: jest.fn(),
                upsert: jest.fn(),
            },
            menuItem: {
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        };

        service = new ToastService(prisma);
        (global.fetch as any) = jest.fn();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('masks clientSecret in getSettings response', async () => {
        prisma.toastSettings.findUnique.mockResolvedValue({
            id: 'toast-settings-1',
            restaurantId,
            clientId: 'toast-client-id',
            clientSecret: 'super-secret',
            toastRestaurantExternalId: 'toast-restaurant-guid',
            apiBaseUrl: 'https://ws-api.toasttab.com',
            defaultOrderLookbackHours: 24,
            autoSyncEnabled: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const result = await service.getSettings(superAdminActor, restaurantId);

        expect(result.configured).toBe(true);
        if (!result.settings) {
            throw new Error('Expected settings to be present');
        }
        expect(result.settings.clientSecret).toBe('••••••••');
    });

    it('syncs menu using mock Toast payload fixtures', async () => {
        const auth = fixture('auth-success.json');
        const metadata = fixture('menu-metadata.json');
        const menu = fixture('menu-full.json');

        prisma.toastSettings.findUnique.mockResolvedValue({
            restaurantId,
            clientId: 'toast-client-id',
            clientSecret: 'toast-client-secret',
            toastRestaurantExternalId: 'toast-restaurant-guid',
            apiBaseUrl: 'https://ws-api.toasttab.com',
            defaultOrderLookbackHours: 24,
            autoSyncEnabled: false,
            isActive: true,
        });

        prisma.toastSyncLog.create.mockResolvedValue({ id: 'log-1' });
        prisma.toastSyncState.upsert.mockResolvedValue({
            restaurantId,
            menuLastUpdatedAt: null,
        });
        prisma.menuCategory.upsert
            .mockResolvedValueOnce({ id: 'cat-1' })
            .mockResolvedValueOnce({ id: 'cat-1' })
            .mockResolvedValueOnce({ id: 'cat-2' });
        prisma.toastMenuItemMapping.findUnique.mockResolvedValue(null);
        prisma.menuItem.findFirst.mockResolvedValue(null);

        let itemCounter = 0;
        prisma.menuItem.create.mockImplementation(async () => {
            itemCounter += 1;
            return { id: `menu-item-${itemCounter}` };
        });

        prisma.toastMenuItemMapping.upsert.mockResolvedValue({ id: 'map-1' });
        prisma.toastSyncState.update.mockResolvedValue({ id: 'sync-state-1' });
        prisma.toastSyncLog.update.mockResolvedValue({ id: 'log-1' });

        (global.fetch as any)
            .mockResolvedValueOnce(mockFetchJson(auth))
            .mockResolvedValueOnce(mockFetchJson(metadata))
            .mockResolvedValueOnce(mockFetchJson(menu));

        const result = await service.syncMenu(superAdminActor, restaurantId, {
            force: true,
        });

        expect(result.skipped).toBe(false);
        if (result.skipped) {
            throw new Error('Expected non-skipped sync result');
        }
        if (!('extractedItems' in result) || !('itemsUpserted' in result)) {
            throw new Error('Expected extractedItems/itemsUpserted in sync result');
        }
        expect(result.extractedItems).toBe(3);
        expect(result.itemsUpserted).toBe(3);
        expect(prisma.toastSyncLog.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: ToastSyncStatus.SUCCESS,
                    categoriesUpserted: 3,
                    itemsUpserted: 3,
                }),
            }),
        );

        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(prisma.toastSyncLog.create).toHaveBeenCalledWith({
            data: {
                restaurantId,
                syncType: ToastSyncType.MENU,
                status: ToastSyncStatus.SUCCESS,
            },
        });
    });
});
