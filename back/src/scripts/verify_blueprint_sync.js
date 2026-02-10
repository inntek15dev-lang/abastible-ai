const fs = require('fs');
const path = require('path');

const BLUEPRINT_PATH = path.resolve(__dirname, '../../../.agent/prompts/master_blueprint.prompt');
const SEED_PATH = path.resolve(__dirname, '../seed.js');

function verifyBlueprintSync() {
    console.log('🔍 Verifying Blueprint <-> Seed Synchronization...');

    if (!fs.existsSync(BLUEPRINT_PATH)) {
        console.error('❌ Blueprint not found at:', BLUEPRINT_PATH);
        process.exit(1);
    }

    if (!fs.existsSync(SEED_PATH)) {
        console.error('❌ Seed file not found at:', SEED_PATH);
        process.exit(1);
    }

    const blueprintContent = fs.readFileSync(BLUEPRINT_PATH, 'utf8');
    const seedContent = fs.readFileSync(SEED_PATH, 'utf8');

    // 1. Extract Seed Data from Blueprint
    // Looking for the JSON block under ## VII. SEED DATA INICIAL
    const seedSectionRegex = /## VII\. SEED DATA INICIAL\s+```json([\s\S]*?)```/;
    const match = blueprintContent.match(seedSectionRegex);

    if (!match) {
        console.error('❌ Could not find "SEED DATA INICIAL" JSON block in Blueprint.');
        process.exit(1);
    }

    let blueprintData;
    try {
        blueprintData = JSON.parse(match[1].trim());
    } catch (e) {
        console.error('❌ Error parsing Blueprint Seed JSON:', e.message);
        process.exit(1);
    }

    let hasErrors = false;

    // 2. Verify Users
    console.log('\nChecking Users...');
    const blueprintUsers = blueprintData.users || [];
    const seedUsersContent = seedContent; // simplified check

    blueprintUsers.forEach(user => {
        // Simple string match to ensure the email exists in seed.js
        if (!seedUsersContent.includes(user.email)) {
            console.error(`❌ Missing User in seed.js: ${user.email} (defined in Blueprint)`);
            hasErrors = true;
        } else {
            console.log(`✅ Found: ${user.email}`);
        }
    });

    // 3. Verify Roles
    console.log('\nChecking Roles...');
    const blueprintRoles = blueprintData.roles || [];
    blueprintRoles.forEach(role => {
        // Checking for role name in seed.js
        if (!seedUsersContent.includes(`'${role.name}'`) && !seedUsersContent.includes(`"${role.name}"`)) {
            console.error(`❌ Missing Role in seed.js: ${role.name} (defined in Blueprint)`);
            hasErrors = true;
        } else {
            console.log(`✅ Found: ${role.name}`);
        }
    });

    // 4. Verify Configs
    console.log('\nChecking Configurations...');
    const blueprintConfigs = blueprintData.configuraciones || [];
    blueprintConfigs.forEach(conf => {
        if (!seedUsersContent.includes(conf.key)) {
            console.error(`❌ Missing Config Key in seed.js: ${conf.key} (defined in Blueprint)`);
            hasErrors = true;
        } else {
            console.log(`✅ Found: ${conf.key}`);
        }
    });

    if (hasErrors) {
        console.error('\n❌ SYNC FAILED: seed.js is missing data defined in master_blueprint.prompt');
        console.error('👉 Rule: Any new element/user/role added to Blueprint MUST be added to seed.js');
        process.exit(1);
    } else {
        console.log('\n✅ Blueprint and Seed are synchronized.');
        process.exit(0);
    }
}

verifyBlueprintSync();
