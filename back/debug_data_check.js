
const { RegistroActividad, sequelize } = require('./src/database/models');

async function seedData() {
    try {
        const activities = await RegistroActividad.findAll();
        console.log(`Found ${activities.length} activities. Updating...`);

        for (const act of activities) {
            const cumple = Math.random() > 0.3 ? 1 : 0; // 70% chance of compliance
            const auditor = Math.random() > 0.5 ? (Math.random() > 0.3 ? 1 : 0) : null; // Mixed auditor status

            await act.update({
                cumple: cumple,
                cumple_auditor: auditor
            });
        }
        console.log('Data seeded.');

    } catch (error) {
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

seedData();
