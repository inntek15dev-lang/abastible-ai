const CryptoJS = require('crypto-js');
const pako = require('pako');

/**
 * Decrypts and decompresses a data string encrypted with AES-256-CBC and compressed with GZIP (Deflate).
 * Matches the PHP openssl_decrypt + gzinflate implementation.
 * 
 * @param {string} cadenatexto - The Base64URL encoded encrypted string
 * @returns {object|null} - The decrypted JSON object or null if failed
 */
const decryptDataString = (cadenatexto) => {
    try {
        if (!cadenatexto) return null;
        console.log("[CRYPTO] Intentando desencriptar payload...");
        
        const keyString = 'MolycopSecureTrainingKey2024###';
        
        // 1. Revert Base64URL to standard Base64
        const base64 = cadenatexto.replace(/-/g, '+').replace(/_/g, '/');
        
        // 2. Decode Base64 to WordArray (CryptoJS format)
        const combined = CryptoJS.enc.Base64.parse(base64);
        
        // 3. Extract IV (first 16 bytes / 4 words)
        const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
        
        // 4. Extract Encrypted Data (rest of the words)
        const encryptedData = CryptoJS.lib.WordArray.create(combined.words.slice(4));
        
        // 5. Decrypt using AES-256-CBC
        // PHP pads the key with null bytes to 32 bytes for AES-256
        let key = CryptoJS.enc.Utf8.parse(keyString);
        if (key.sigBytes < 32) {
            // Manually add null byte to match PHP behavior
            key.words[key.sigBytes >>> 2] |= 0x00 << (24 - (key.sigBytes % 4) * 8);
            key.sigBytes = 32;
        }
        
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: encryptedData },
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7 // PHP's default padding is PKCS7
            }
        );

        // 6. Convert decrypted WordArray to Uint8Array for decompression
        const decryptedUint8 = wordToUint8Array(decrypted);
        
        // 7. Decompress using pako (equivalent to PHP's gzinflate)
        // gzinflate uses raw DEFLATE (no zlib headers)
        const decompressed = pako.inflateRaw(decryptedUint8, { to: 'string' });
        
        // 8. Parse JSON
        const result = JSON.parse(decompressed);
        console.log("[CRYPTO] Desencriptación exitosa:", result);
        return result;
    } catch (err) {
        console.error("[CRYPTO] Error crítico en desencriptación:", err.message);
        return null;
    }
};

/**
 * Helper to convert CryptoJS WordArray to Uint8Array
 */
function wordToUint8Array(wordArray) {
    const words = wordArray.words;
    const sigBytes = wordArray.sigBytes;
    const uint8 = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i++) {
        const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        uint8[i] = byte;
    }
    return uint8;
}

module.exports = {
    decryptDataString
};
