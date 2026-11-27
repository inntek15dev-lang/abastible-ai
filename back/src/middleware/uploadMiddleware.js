// IEEE Trace: SPRINT-5 | Middleware for File Uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Safe filename: timestamp-original
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedExts = ['.jpeg', '.jpg', '.png', '.pdf', '.xlsx', '.xls'];
    const allowedMimes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const ext = path.extname(file.originalname || '').toLowerCase();

    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
        return cb(null, true);
    }
    cb(new Error('Formato de archivo no permitido. Solo PDF, Imágenes y Excel.'), false);
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5
    },
    fileFilter: fileFilter
});

module.exports = upload;
