// IEEE Trace: REQ-005 | components/forms/FileUpload.jsx
import { useState, useRef } from 'react';
import api from '../../api';
import { Upload, X, File, Image, FileText } from 'lucide-react';

export default function FileUpload({
    registroActividadId,
    onUploadComplete,
    maxFiles = 4,
    existingCount = 0,
    templateUrl = null, // New prop for template
    onFileSelect = null // New prop for pending uploads
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

        // If onFileSelect is provided, we just pass the file up and don't upload immediately
        if (onFileSelect) {
            onFileSelect(file);
            // Clear input so same file can be selected again if needed (or not)
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
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

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', width: '100%', flexWrap: 'wrap' }}>
                    {/* Template Download Button */}
                    <a
                        href={templateUrl ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${templateUrl}` : '#'}
                        target={templateUrl ? "_blank" : undefined}
                        rel={templateUrl ? "noopener noreferrer" : undefined}
                        className={`template-download-btn ${!templateUrl ? 'disabled' : ''}`}
                        onClick={(e) => !templateUrl && e.preventDefault()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            color: templateUrl ? '#2563eb' : '#9ca3af',
                            textDecoration: 'none',
                            padding: '0.5rem',
                            border: `1px dashed ${templateUrl ? '#2563eb' : '#d1d5db'}`,
                            borderRadius: '4px',
                            backgroundColor: templateUrl ? '#eff6ff' : '#f3f4f6',
                            transition: 'all 0.2s',
                            flex: 1,
                            cursor: templateUrl ? 'pointer' : 'not-allowed',
                            height: '38px', // Match standard button height
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                            if (templateUrl) e.currentTarget.style.backgroundColor = '#dbeafe';
                        }}
                        onMouseLeave={(e) => {
                            if (templateUrl) e.currentTarget.style.backgroundColor = '#eff6ff';
                        }}
                        title={!templateUrl ? "Sin plantilla disponible" : "Descargar Plantilla"}
                    >
                        <FileText size={14} />
                        {templateUrl ? 'Descargar Plantilla' : 'Sin Plantilla'}
                    </a>

                    <button
                        type="button"
                        className="upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canUpload || uploading}
                        style={{ flex: 1, height: '38px' }}
                    >
                        <Upload size={18} />
                        {uploading ? 'Subiendo...' : 'Subir Evidencia'}
                    </button>
                </div>

                <span className="upload-info">
                    {existingCount}/{maxFiles} archivos
                </span>
            </div>
        </div>
    );
}
