const { User } = require('./database/models');
const bcrypt = require('bcryptjs');

async function verify() {
    try {
        const user = await User.findOne({ where: { email: 'admin@abastible.cl' } });
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('User found:', user.email);
        console.log('Stored Hash:', user.password);

        const password = 'User123*';
        const isValid = await bcrypt.compare(password, user.password);

        console.log(`Testing '${password}': ${isValid ? 'MATCH ✅' : 'mismatch ❌'}`);

        // Re-hash to see if it's consistent
        const newHash = await bcrypt.hash(password, 10);
        console.log('New Hash:', newHash);
        const newValid = await bcrypt.compare(password, newHash);
        console.log('New Hash verification:', newValid);

    } catch (error) {
        console.error('Error:', error);
    }
}

verify();
