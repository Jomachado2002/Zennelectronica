#!/usr/bin/env node
'use strict';

/**
 * Restaura datos de negocio desde una base backup hacia la base activa.
 * NO toca productos ni categorías.
 *
 * Uso:
 *   node scripts/restore-business-data-from-backup.js --dry-run
 *   CONFIRM_BUSINESS_RESTORE=yes node scripts/restore-business-data-from-backup.js --confirm
 *
 * Variables opcionales (.env):
 *   MONGODB_URI              → base destino (Eccomercejm)
 *   MONGODB_BACKUP_URI       → URI completa al backup (prioridad)
 *   MONGODB_BACKUP_DB_NAME   → nombre DB origen (default: Eccomercejm_backup)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const BUSINESS_COLLECTIONS = [
    'users',
    'clients',
    'sales',
    'purchases',
    'suppliers',
    'budgets',
    'bancard_transactions',
    'balances',
    'addtocarts',
    'branches',
    'salespeople',
    'salestypes',
    'purchasetypes',
    'profitabilityanalyses'
];

const SKIP_COLLECTIONS = new Set(['products', 'categories', 'exchangerates']);

function hasFlag(name) {
    return process.argv.includes(name);
}

function truthy(v) {
    return v === '1' || v === 'true' || v === 'yes';
}

function maskUri(uri) {
    return String(uri || '').replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

function buildBackupUri() {
    if (process.env.MONGODB_BACKUP_URI) return process.env.MONGODB_BACKUP_URI;

    const sourceDb =
        process.env.MONGODB_BACKUP_DB_NAME ||
        process.env.MONGODB_SOURCE_DB_NAME ||
        'Eccomercejm_backup';

    const targetUri = process.env.MONGODB_URI;
    if (!targetUri) throw new Error('Falta MONGODB_URI en backend/.env');

    const replaced = targetUri.replace(/\/([^/?]+)(\?|$)/, `/${sourceDb}$2`);
    if (replaced === targetUri) {
        throw new Error('No se pudo derivar URI del backup desde MONGODB_URI');
    }
    return replaced;
}

async function connect(uri, label) {
    const conn = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 20000
    }).asPromise();
    console.log(`✅ Conectado (${label}): ${maskUri(uri)} → ${conn.db.databaseName}`);
    return conn;
}

async function listCounts(conn) {
    const out = {};
    const cols = await conn.db.listCollections().toArray();
    for (const { name } of cols.sort((a, b) => a.name.localeCompare(b.name))) {
        out[name] = await conn.db.collection(name).countDocuments();
    }
    return out;
}

async function collectionExists(conn, name) {
    const cols = await conn.db.listCollections({ name }).toArray();
    return cols.length > 0;
}

async function restoreCollection(sourceConn, targetConn, collectionName, dryRun) {
    const sourceCol = sourceConn.db.collection(collectionName);
    const targetCol = targetConn.db.collection(collectionName);

    const sourceCount = await sourceCol.countDocuments();
    const targetCount = await targetCol.countDocuments();

    console.log(`\n📦 ${collectionName}`);
    console.log(`   origen: ${sourceCount} | destino actual: ${targetCount}`);

    if (sourceCount === 0) {
        console.log('   ⏭️  Sin documentos en backup, se omite.');
        return { collectionName, copied: 0, skipped: true };
    }

    if (dryRun) {
        console.log(`   🔍 dry-run: se copiarían ${sourceCount} documentos (upsert por _id).`);
        return { collectionName, copied: sourceCount, dryRun: true };
    }

    const cursor = sourceCol.find({});
    const batchSize = 200;
    let batch = [];
    let copied = 0;

    async function flush() {
        if (!batch.length) return;
        const ops = batch.map((doc) => ({
            replaceOne: {
                filter: { _id: doc._id },
                replacement: doc,
                upsert: true
            }
        }));
        await targetCol.bulkWrite(ops, { ordered: false });
        copied += batch.length;
        batch = [];
        process.stdout.write(`\r   ↳ copiados: ${copied}/${sourceCount}`);
    }

    for await (const doc of cursor) {
        batch.push(doc);
        if (batch.length >= batchSize) await flush();
    }
    await flush();
    console.log(`\n   ✅ listo (${copied} documentos)`);
    return { collectionName, copied };
}

async function main() {
    const dryRun = hasFlag('--dry-run') || !hasFlag('--confirm');
    const confirmEnv = truthy(process.env.CONFIRM_BUSINESS_RESTORE);

    if (!dryRun && !confirmEnv) {
        console.error(`
❌ Para restaurar en serio necesitás:
   CONFIRM_BUSINESS_RESTORE=yes node scripts/restore-business-data-from-backup.js --confirm

Primero ejecutá sin --confirm (dry-run):
   node scripts/restore-business-data-from-backup.js --dry-run
`);
        process.exit(1);
    }

    const targetUri = process.env.MONGODB_URI;
    const backupUri = buildBackupUri();

    console.log('═══════════════════════════════════════════════════');
    console.log('  RESTAURAR DATOS DE NEGOCIO (sin productos/categorías)');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Modo: ${dryRun ? 'DRY-RUN (simulación)' : 'RESTAURACIÓN REAL'}`);
    console.log(`Destino: ${maskUri(targetUri)}`);
    console.log(`Origen:  ${maskUri(backupUri)}`);
    console.log(`Colecciones: ${BUSINESS_COLLECTIONS.join(', ')}`);
    console.log(`Excluidas: ${[...SKIP_COLLECTIONS].join(', ')}\n`);

    let sourceConn;
    let targetConn;

    try {
        targetConn = await connect(targetUri, 'destino');
        sourceConn = await connect(backupUri, 'backup');

        if (sourceConn.db.databaseName === targetConn.db.databaseName) {
            throw new Error('Origen y destino son la misma base de datos. Abortado.');
        }

        const sourceCounts = await listCounts(sourceConn);
        const targetCounts = await listCounts(targetConn);

        console.log('\n📊 Comparación de colecciones relevantes:');
        const relevant = [...new Set([...BUSINESS_COLLECTIONS, ...SKIP_COLLECTIONS])].sort();
        for (const name of relevant) {
            const s = sourceCounts[name] ?? '-';
            const t = targetCounts[name] ?? '-';
            console.log(`   ${name.padEnd(24)} backup: ${String(s).padStart(6)} | actual: ${String(t).padStart(6)}`);
        }

        const missingInBackup = [];
        for (const name of BUSINESS_COLLECTIONS) {
            if (!(await collectionExists(sourceConn, name))) missingInBackup.push(name);
        }
        if (missingInBackup.length) {
            console.warn(`\n⚠️  En el backup no existen: ${missingInBackup.join(', ')}`);
        }

        const totalSourceBusiness = BUSINESS_COLLECTIONS.reduce(
            (sum, c) => sum + (sourceCounts[c] || 0),
            0
        );
        if (totalSourceBusiness === 0) {
            console.error(`
❌ El backup no tiene datos de negocio (ventas/clientes/compras/usuarios en 0).

Pasos sugeridos:
  1. Entrá a MongoDB Atlas → Backup → Restore snapshot
  2. Restaurá a una base nueva, por ejemplo: Eccomercejm_backup
  3. Volvé a ejecutar este script con --dry-run
`);
            process.exit(1);
        }

        const results = [];
        for (const collectionName of BUSINESS_COLLECTIONS) {
            if (!(await collectionExists(sourceConn, collectionName))) continue;
            results.push(await restoreCollection(sourceConn, targetConn, collectionName, dryRun));
        }

        console.log('\n═══════════════════════════════════════════════════');
        if (dryRun) {
            console.log('✨ Simulación terminada. Si los números son correctos:');
            console.log('   CONFIRM_BUSINESS_RESTORE=yes node scripts/restore-business-data-from-backup.js --confirm');
        } else {
            console.log('✨ Restauración completada.');
            const finalCounts = await listCounts(targetConn);
            console.log('\n📊 Estado final (destino):');
            for (const name of BUSINESS_COLLECTIONS) {
                console.log(`   ${name.padEnd(24)} ${String(finalCounts[name] ?? 0).padStart(6)}`);
            }
        }
        console.log('═══════════════════════════════════════════════════\n');
    } finally {
        if (sourceConn) await sourceConn.close();
        if (targetConn) await targetConn.close();
    }
}

main().catch((err) => {
    console.error('\n❌ Error:', err.message || err);
    process.exit(1);
});
