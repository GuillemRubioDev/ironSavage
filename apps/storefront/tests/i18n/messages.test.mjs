import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.join(import.meta.dirname, '..', '..');

async function findMessageFiles(directory) {
    const files = [];
    for (const entry of await readdir(directory, {withFileTypes: true})) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await findMessageFiles(file)));
        } else if (entry.name.endsWith('.json') && path.basename(directory) === 'messages') {
            files.push(path.relative(root, file));
        }
    }
    return files;
}

async function findTypeScriptFiles(directory) {
    const files = [];
    for (const entry of await readdir(directory, {withFileTypes: true})) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await findTypeScriptFiles(file));
        if (entry.isFile() && /\.tsx?$/.test(entry.name)) files.push(file);
    }
    return files;
}

test('every message file is registered in the locale message loader', async () => {
    const discovered = (await findMessageFiles(path.join(root, 'src'))).sort();
    const registrations = new Set();
    for (const messageFile of discovered) {
        const moduleDirectory = path.dirname(path.dirname(messageFile));
        const registrationFile = path.join(root, `${moduleDirectory}${path.sep}messages.ts`);
        const registration = await readFile(registrationFile, 'utf8');
        const locale = path.basename(messageFile, '.json');
        assert.match(
            registration,
            new RegExp(`\\b${locale}: \\(\\) => import\\(['"]\\./messages/${locale}\\.json['"]\\)`),
            `${messageFile} is not registered under its own locale.`,
        );
        registrations.add(
            path.relative(path.join(root, 'src'), registrationFile)
                .replace(/\\/g, '/')
                .replace(/\.ts$/, ''),
        );
    }

    const composition = await readFile(path.join(root, 'src/site/i18n/messages.ts'), 'utf8');
    const composed = new Set(
        [...composition.matchAll(/from ['"]@\/([^'"]+\/messages)['"]/g)].map(match => match[1]),
    );
    assert.deepEqual(composed, registrations, 'Site message composition must include every module registration.');
});

function messageKeys(value, prefix = '') {
    return Object.entries(value).flatMap(([key, child]) => {
        const qualified = prefix ? `${prefix}.${key}` : key;
        return child && typeof child === 'object' && !Array.isArray(child)
            ? messageKeys(child, qualified)
            : [qualified];
    });
}

test('message keys match across locales', async () => {
    // Supported locales come from routing.ts, not a hardcoded list — this
    // repo dropped German in Fase 16.2B, so "every locale" means es/en today
    // and should track whatever routing.ts declares tomorrow.
    const routingSource = await readFile(path.join(root, 'src/platform/i18n/routing.ts'), 'utf8');
    const localesMatch = routingSource.match(/locales:\s*\[([^\]]+)\]/);
    assert.ok(localesMatch, 'Could not find routing.ts locales list.');
    const locales = [...localesMatch[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
    assert.ok(locales.length > 1, 'routing.ts must declare at least two locales to compare.');

    const discovered = await findMessageFiles(path.join(root, 'src'));
    const primaryLocale = locales[0];
    const primaryFiles = discovered.filter(file => path.basename(file) === `${primaryLocale}.json`);
    for (const primaryFile of primaryFiles) {
        const primary = JSON.parse(await readFile(path.join(root, primaryFile), 'utf8'));
        for (const locale of locales.slice(1)) {
            const localeFile = path.join(path.dirname(primaryFile), `${locale}.json`);
            assert.ok(discovered.includes(localeFile), `${primaryFile} has no matching ${locale}.json file.`);
            const localeMessages = JSON.parse(await readFile(path.join(root, localeFile), 'utf8'));
            assert.deepEqual(
                messageKeys(localeMessages).sort(),
                messageKeys(primary).sort(),
                `${primaryFile} and ${localeFile} must define the same message keys.`,
            );
        }
    }
});

test('message namespaces are unique per locale', async () => {
    const owners = new Map();
    for (const file of await findMessageFiles(path.join(root, 'src'))) {
        const locale = path.basename(file, '.json');
        const messages = JSON.parse(await readFile(path.join(root, file), 'utf8'));
        for (const namespace of Object.keys(messages)) {
            const key = `${locale}:${namespace}`;
            assert.ok(
                !owners.has(key),
                `Namespace "${namespace}" for locale "${locale}" is defined in both ${owners.get(key)} and ${file}.`,
            );
            owners.set(key, file);
        }
    }
});

// Namespaces intentionally shared beyond their owning feature — a deliberate
// architecture decision, not a per-file exception. Account owns generic "my
// stuff" table vocabulary (date, status, download, totalHeader) reused as-is
// by the account-adjacent invoices/loyalty pages instead of being duplicated
// under their own namespace. Any other cross-feature reuse still fails below.
const SHARED_NAMESPACES = new Set(['Account']);

test('features use only owned or shared message namespaces', async () => {
    const owners = new Map();
    for (const file of (await findMessageFiles(path.join(root, 'src'))).filter(candidate => path.basename(candidate) === 'en.json')) {
        const messages = JSON.parse(await readFile(path.join(root, file), 'utf8'));
        const feature = file.match(/^src[/\\]features[/\\]([^/\\]+)[/\\]/)?.[1];
        const owner = feature ?? (file.startsWith(`src${path.sep}platform${path.sep}i18n${path.sep}`) ? 'platform.i18n' : 'site');
        for (const namespace of Object.keys(messages)) owners.set(namespace, owner);
    }

    const violations = [];
    const featuresRoot = path.join(root, 'src', 'features');
    for (const file of await findTypeScriptFiles(featuresRoot)) {
        const feature = path.relative(featuresRoot, file).split(path.sep)[0];
        const content = await readFile(file, 'utf8');
        const namespaces = [
            ...content.matchAll(/(?:useTranslations|getTranslations)\(\s*['"]([^'"]+)['"]/g),
            ...content.matchAll(/namespace:\s*['"]([^'"]+)['"]/g),
        ].map(match => match[1]);
        for (const namespace of namespaces) {
            // next-intl lets a namespace argument descend into a nested key
            // (e.g. 'Verify.pending' scopes into the "pending" object inside
            // the top-level "Verify" namespace) — ownership is decided by
            // the top-level namespace, not the full dotted path.
            const topLevelNamespace = namespace.split('.')[0];
            const owner = owners.get(topLevelNamespace);
            if (owner !== feature && owner !== 'platform.i18n' && !SHARED_NAMESPACES.has(topLevelNamespace)) {
                violations.push(`${path.relative(root, file)} uses ${namespace} owned by ${owner ?? 'nobody'}`);
            }
        }
    }
    assert.deepEqual(violations, []);
});
