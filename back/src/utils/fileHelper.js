// IEEE Trace: INFRA | utils/fileHelper.js
// Helper for safe file operations across different filesystems/mount points.
// Docker volumes create separate mount points, so fs.renameSync fails with EXDEV.
// This helper uses copy+delete as a fallback.

const fs = require('fs');

/**
 * Moves a file from source to destination.
 * Uses rename for same-filesystem moves, falls back to copy+delete for cross-filesystem (EXDEV).
 * @param {string} source - Absolute path to source file
 * @param {string} destination - Absolute path to destination file
 */
function safeMove(source, destination) {
    try {
        fs.renameSync(source, destination);
    } catch (err) {
        if (err.code === 'EXDEV') {
            // Cross-device move: copy then delete
            fs.copyFileSync(source, destination);
            fs.unlinkSync(source);
        } else {
            throw err;
        }
    }
}

module.exports = { safeMove };
