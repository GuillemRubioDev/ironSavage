import assert from 'node:assert/strict';
import { test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const { ContentService } = require('./content.service');
const { ContentArticle } = require('./content-article.entity');

function matches(row: any, where: Record<string, unknown>): boolean {
    return Object.entries(where).every(([k, v]) => String(row[k]) === String(v));
}

function createFakeDb() {
    const articles = new Map<string, any>();
    let nextId = 1;

    const repo = {
        findOne: async ({ where }: { where: Record<string, unknown> }) => {
            for (const a of articles.values()) if (matches(a, where)) return a;
            return null;
        },
        findAndCount: async ({ where, skip = 0, take = 20 }: { where: Record<string, unknown>; skip?: number; take?: number }) => {
            const all = [...articles.values()].filter(a => matches(a, where));
            return [all.slice(skip, skip + take), all.length] as const;
        },
        save: async (input: any) => {
            const isNew = !input.id;
            const key = isNew ? String(nextId++) : String(input.id);
            for (const a of articles.values()) {
                if (String(a.id) !== key && a.slug === input.slug) {
                    const err: any = new Error('duplicate key value violates unique constraint');
                    err.code = '23505';
                    throw err;
                }
            }
            const saved = { ...input, id: key, createdAt: input.createdAt ?? new Date(), updatedAt: new Date() };
            articles.set(key, saved);
            return saved;
        },
        delete: async (id: string) => {
            const existed = articles.delete(String(id));
            return { affected: existed ? 1 : 0 };
        },
    };

    return { articles, repo };
}

function createService() {
    const db = createFakeDb();
    const connectionMock = { getRepository: (_ctx: unknown, _entity: unknown) => db.repo };
    return { service: new ContentService(connectionMock), db };
}

function validInput(overrides: Record<string, unknown> = {}) {
    return {
        titleEs: 'Nuevo suplemento en la tienda',
        titleEn: 'New supplement in the store',
        slug: 'nuevo-suplemento-en-la-tienda',
        excerptEs: 'Un resumen breve del artículo.',
        excerptEn: 'A short summary of the article.',
        contentEs: 'El contenido completo del artículo va aquí.',
        contentEn: 'The full article content goes here.',
        ...overrides,
    };
}

test('a published article appears in the public listing', async () => {
    const { service } = createService();
    const created = await service.create({}, validInput());
    assert.equal(created.success, true);
    await service.publish({}, created.article.id);

    const publicList = await service.listPublished({});

    assert.equal(publicList.totalItems, 1);
    assert.equal(publicList.items[0].status, 'PUBLISHED');
});

test('a draft article does not appear in the public listing or by slug', async () => {
    const { service } = createService();
    const created = await service.create({}, validInput({ slug: 'borrador' }));
    assert.equal(created.article.status, 'DRAFT');

    const publicList = await service.listPublished({});
    const bySlug = await service.findPublishedBySlug({}, 'borrador');

    assert.equal(publicList.totalItems, 0);
    assert.equal(bySlug, null);
});

test('an archived article does not appear in the public listing or by slug', async () => {
    const { service, db } = createService();
    const created = await service.create({}, validInput({ slug: 'archivado' }));
    await service.publish({}, created.article.id);
    // El archivado se hace con el campo de estado genérico (no hay método propio en
    // el servicio), así que se cambia directamente en el repositorio falso que usa el
    // servicio: el mismo efecto que un administrador poniendo status: ARCHIVED.
    db.articles.get(String(created.article.id)).status = 'ARCHIVED';

    const publicList = await service.listPublished({});
    const bySlug = await service.findPublishedBySlug({}, 'archivado');

    assert.equal(publicList.totalItems, 0);
    assert.equal(bySlug, null);
});

test('a second article cannot reuse an existing slug', async () => {
    const { service } = createService();
    const first = await service.create({}, validInput({ slug: 'mismo-slug' }));
    assert.equal(first.success, true);

    const second = await service.create({}, validInput({ title: 'Otro título', slug: 'mismo-slug' }));

    assert.equal(second.success, false);
});

test('updating an article to reuse another article\'s slug is rejected', async () => {
    const { service } = createService();
    await service.create({}, validInput({ slug: 'primero' }));
    const second = await service.create({}, validInput({ title: 'Segundo', slug: 'segundo' }));

    const result = await service.update({}, second.article.id, { slug: 'primero' });

    assert.equal(result.success, false);
});
