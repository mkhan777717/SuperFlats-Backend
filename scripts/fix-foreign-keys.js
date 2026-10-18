// scripts/fix-foreign-keys.js
//
// Rebuilds every foreign key so its ON DELETE rule matches the models.
// `sequelize.sync({ force: false })` never alters existing tables, so a constraint
// created without ON DELETE (or duplicated by old `alter` syncs, e.g. `favorites_listings_ibfk_34`)
// stays broken forever. This drops ALL constraints on each listed column, whatever their name,
// and recreates a single one with a stable name.
//
// Usage:
//   node scripts/fix-foreign-keys.js            # dry run: shows what would change
//   node scripts/fix-foreign-keys.js --apply    # applies the changes
//   docker compose exec api node scripts/fix-foreign-keys.js --apply

const db = require('../models');

// [table, column, referenced table, ON DELETE]
const FOREIGN_KEYS = [
    ['appointments', 'listing_id', 'listings', 'CASCADE'],
    ['appointments', 'user_id', 'users', 'CASCADE'],
    ['appointments', 'company_id', 'companies', 'CASCADE'],
    ['appointments', 'employee_id', 'users', 'SET NULL'],
    ['bookings', 'flat_id', 'flats', 'CASCADE'],
    ['bookings', 'tenant_id', 'tenants', 'CASCADE'],
    ['employees', 'user_id', 'users', 'CASCADE'],
    ['employees', 'company_id', 'companies', 'CASCADE'],
    ['favorites_listings', 'user_id', 'users', 'CASCADE'],
    ['favorites_listings', 'listing_id', 'listings', 'CASCADE'],
    ['flats', 'company_id', 'companies', 'CASCADE'],
    ['flats', 'property_id', 'properties', 'CASCADE'],
    ['listings', 'flat_id', 'flats', 'CASCADE'],
    ['listings', 'lister_id', 'users', 'CASCADE'],
    ['listings', 'company_id', 'companies', 'CASCADE'],
    ['password_reset_tokens', 'user_id', 'users', 'CASCADE'],
    ['properties', 'company_id', 'companies', 'CASCADE'],
    ['refresh_tokens', 'userId', 'users', 'CASCADE'],
    ['rent_bills', 'booking_id', 'bookings', 'CASCADE'],
    ['rent_bills', 'tenant_id', 'tenants', 'CASCADE'],
    ['tenants', 'company_id', 'companies', 'CASCADE'],
    ['tenants', 'property_id', 'properties', 'CASCADE'],
    ['users', 'company_id', 'companies', 'CASCADE'],
];

const apply = process.argv.includes('--apply');

async function getConstraints(sequelize) {
    const [rows] = await sequelize.query(`
        SELECT k.TABLE_NAME AS tableName, k.COLUMN_NAME AS columnName, k.CONSTRAINT_NAME AS name,
               k.REFERENCED_TABLE_NAME AS refTable, r.DELETE_RULE AS deleteRule
        FROM information_schema.KEY_COLUMN_USAGE k
        JOIN information_schema.REFERENTIAL_CONSTRAINTS r
          ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
        WHERE k.TABLE_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL
    `);
    return rows;
}

async function main() {
    const { sequelize } = db;
    const constraints = await getConstraints(sequelize);
    const [tables] = await sequelize.query(
        'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
    );
    const existingTables = new Set(tables.map(t => t.name));
    let changes = 0;

    for (const [table, column, refTable, onDelete] of FOREIGN_KEYS) {
        if (!existingTables.has(table)) {
            console.log(`skip     ${table}.${column} (table does not exist)`);
            continue;
        }
        const current = constraints.filter(c => c.tableName === table && c.columnName === column);
        const name = `${table}_${column}_fk`;
        const ok = current.length === 1 && current[0].name === name
            && current[0].refTable === refTable && current[0].deleteRule === onDelete;
        if (ok) {
            console.log(`ok       ${table}.${column} -> ${refTable} ON DELETE ${onDelete}`);
            continue;
        }

        changes++;
        const desc = current.map(c => `${c.name}(${c.deleteRule})`).join(', ') || 'none';
        console.log(`${apply ? 'fixing ' : 'would fix'} ${table}.${column}: [${desc}] -> ${name} ON DELETE ${onDelete}`);
        if (!apply) continue;

        for (const c of current) {
            await sequelize.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${c.name}\``);
        }
        await sequelize.query(
            `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\` FOREIGN KEY (\`${column}\`) ` +
            `REFERENCES \`${refTable}\` (\`id\`) ON DELETE ${onDelete} ON UPDATE CASCADE`
        );
    }

    // Flag any constraint not covered above that would still block deletes.
    const known = new Set(FOREIGN_KEYS.map(([t, c]) => `${t}.${c}`));
    for (const c of constraints) {
        if (!known.has(`${c.tableName}.${c.columnName}`) && ['RESTRICT', 'NO ACTION'].includes(c.deleteRule)) {
            console.warn(`WARNING  unmanaged ${c.tableName}.${c.columnName} (${c.name}) has ON DELETE ${c.deleteRule}`);
        }
    }

    console.log(apply
        ? `\nDone: ${changes} column(s) fixed.`
        : `\nDry run: ${changes} column(s) need fixing. Re-run with --apply.`);
    await sequelize.close();
}

main().catch(async (err) => {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
});
