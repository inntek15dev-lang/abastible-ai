// IEEE Trace: REQ-005 | components/forms/FileUpload.jsx
import { useState, useRef } from 'react';
import api from '../../api';
import { Upload, X, File, Image, FileText } from 'lucide-react';

export default function FileUpload({
    registroActividadId,
    onUploadComplete,
    maxFiles = 4,
    existingCount = 0
}) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    const canUpload = existingCount < maxFiles;

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setError('');

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            setError('El archivo excede el tamaño máximo de 10MB');
            return;
        }

        // Show preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target.result);
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }

        // Upload
        setUploading(true);
        const formData = new FormData();
        formData.append('archivo', file);
        formData.append('registro_actividad_id', registroActividadId);

        try {
            const response = await api.post('/evidencias', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setPreview(null);
            if (onUploadComplete) {
                onUploadComplete(response.data.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al subir archivo');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const getFileIcon = (mimeType) => {
        if (mimeType?.startsWith('image/')) return Image;
        if (mimeType?.includes('pdf')) return FileText;
        return File;
    };

    return (
        <div className="file-upload">
            {error && <div className="error-message small">{error}</div>}

            {preview && (
                <div className="preview-container">
                    <img src={preview} alt="Preview" className="preview-image" />
                    <button className="btn-icon" onClick={() => setPreview(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="upload-area">
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    disabled={!canUpload || uploading}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    style={{ display: 'none' }}
                />

                <button
                    type="button"
                    className="upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!canUpload || uploading}
                >
                    <Upload size={18} />
                    {uploading ? 'Subiendo...' : 'Subir Evidencia'}
                </button>

                <span className="upload-info">
                    {existingCount}/{maxFiles} archivos
                </span>
            </div>
        </div>
    );
}
