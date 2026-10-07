import { CoreDbProvider } from '@/core/services/db';

jest.mock('@services/platform', () => ({
    CorePlatform: { ready: jest.fn().mockResolvedValue(true) },
}));

describe('CoreDbProvider PRAGMA page_size behavior', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('should set PRAGMA page_size when database is new (page_count == 0)', async () => {
        const mockExecuteSql = jest.fn()
            // First call: PRAGMA page_count -> return 0
            .mockImplementationOnce(async (sql: string) => ({ rows: { length: 1, item: () => ({ 'page_count()': 0 }) } }))
            // Second call: PRAGMA page_size = 16384
            .mockImplementationOnce(async (sql: string) => ({ rows: { length: 0 } }))
            // Any further calls: return empty result
            .mockImplementation(async () => ({ rows: { length: 0 } }));

        const fakeDb = {
            executeSql: mockExecuteSql,
            sqlBatch: jest.fn(),
            close: jest.fn(),
        } as unknown as any;

        const SQLiteMock = { create: jest.fn().mockResolvedValue(fakeDb), deleteDatabase: jest.fn() };

        jest.doMock('@singletons', () => ({ SQLite: SQLiteMock, makeSingleton: (c: any) => c }));

        const { CoreDbProvider: Provider } = await import('@/core/services/db');

        const provider = new Provider();

        const db = provider.getDB('test-new-db', true);

        // Trigger lazy constructor by calling a method that uses the underlying DB.
        await db.execute('SELECT 1');

        // The fake DB should have been used to run PRAGMA page_count and then PRAGMA page_size.
        expect(mockExecuteSql).toHaveBeenCalled();
        const calledSqls = mockExecuteSql.mock.calls.map(call => call[0]);
        expect(calledSqls).toContain('PRAGMA page_count');
        expect(calledSqls).toContain('PRAGMA page_size = 16384');
    });

    it('should NOT set PRAGMA page_size when database already has pages (page_count > 0)', async () => {
        const mockExecuteSql = jest.fn()
            // First call: PRAGMA page_count -> return >0
            .mockImplementationOnce(async (sql: string) => ({ rows: { length: 1, item: () => ({ page_count: 5 }) } }))
            // Any further calls: return empty result
            .mockImplementation(async () => ({ rows: { length: 0 } }));

        const fakeDb = {
            executeSql: mockExecuteSql,
            sqlBatch: jest.fn(),
            close: jest.fn(),
        } as unknown as any;

        const SQLiteMock = { create: jest.fn().mockResolvedValue(fakeDb), deleteDatabase: jest.fn() };

        jest.doMock('@singletons', () => ({ SQLite: SQLiteMock, makeSingleton: (c: any) => c }));

        const { CoreDbProvider: Provider } = await import('@/core/services/db');

        const provider = new Provider();

        const db = provider.getDB('test-existing-db', true);

        await db.execute('SELECT 1');

        const calledSqls = mockExecuteSql.mock.calls.map(call => call[0]);
        expect(calledSqls).toContain('PRAGMA page_count');
        expect(calledSqls).not.toContain('PRAGMA page_size = 16384');
    });
});
