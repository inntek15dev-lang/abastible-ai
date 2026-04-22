// IEEE Trace: REQ-005 | components/forms/FileUpload.jsx
import { useState, useRef } from 'react';
import api from '../../api';
import { Upload, X, File, Image, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function FileUpload({
    registroActividadId,
    onUploadComplete,
    maxFiles = 4,
    existingCount = 0,
    templateUrl = null, // New prop for template
    onFileSelect = null // New prop for pending uploads
}) {
    const { user } = useAuth();
    const isADC = user?.role === 'administrador_contrato';
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    const [uploadProgress, setUploadProgress] = useState(0);

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
        setUploadProgress(0);
        const formData = new FormData();
        formData.append('archivo', file);
        formData.append('registro_actividad_id', registroActividadId);

        try {
            const response = await api.post('/evidencias', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            setPreview(null);
            if (onUploadComplete) {
                onUploadComplete(response.data.data);
            }
            setUploadProgress(100);
            setTimeout(() => setUploadProgress(0), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al subir archivo');
            setUploadProgress(0);
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
            {error && <div className="error-message small" style={{ color: '#ef4444', marginBottom: '4px', fontSize: '0.7rem' }}>{error}</div>}

            {preview && (
                <div className="preview-container" style={{ position: 'relative', marginBottom: '8px' }}>
                    <img src={preview} alt="Preview" className="preview-image" style={{ maxWidth: '100%', borderRadius: '4px', border: '1px solid #e5e7eb' }} />
                    <button 
                        className="btn-icon" 
                        onClick={() => setPreview(null)}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#fff', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '2px' }}
                    >
                        <X size={14} />
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                        {/* Template Download Button */}
                        {!isADC && (
                            <a
                                href={templateUrl ? `${api.defaults.baseURL}/${templateUrl}` : '#'}
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
                                    color: templateUrl ? '#003594' : '#9ca3af',
                                    textDecoration: 'none',
                                    padding: '0.4rem 0.5rem',
                                    border: `1px dashed ${templateUrl ? '#003594' : '#d1d5db'}`,
                                    borderRadius: '4px',
                                    backgroundColor: templateUrl ? '#eff6ff' : '#f3f4f6',
                                    transition: 'all 0.2s',
                                    width: '100%',
                                    cursor: templateUrl ? 'pointer' : 'not-allowed',
                                    height: 'auto',
                                    minHeight: '38px',
                                    textAlign: 'center',
                                    lineHeight: '1.1'
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
                                <div style={{ textAlign: 'center' }}>
                                    {templateUrl ? (
                                        <>Descargar<br/>Plantilla</>
                                    ) : 'Sin Plantilla'}
                                </div>
                            </a>
                        )}

                        {!isADC && (
                            <button
                                type="button"
                                className="upload-btn"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!canUpload || uploading}
                                style={{ 
                                    width: '100%', 
                                    height: '38px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    background: uploading ? '#cbd5e1' : 'var(--color-brand-primary)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: (!canUpload || uploading) ? 'not-allowed' : 'pointer',
                                    fontSize: '0.75rem'
                                }}
                            >
                                <Upload size={14} />
                                {uploading ? 'Subiendo...' : 'Subir Evidencia'}
                            </button>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {(uploading || uploadProgress > 0) && (
                        <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                            <div 
                                style={{ 
                                    width: `${uploadProgress}%`, 
                                    background: uploadProgress === 100 ? '#22c55e' : '#3b82f6', 
                                    height: '100%', 
                                    transition: 'width 0.3s ease-in-out' 
                                }} 
                            />
                        </div>
                    )}
                    
                    {uploadProgress === 100 && !uploading && (
                        <div style={{ fontSize: '0.7rem', color: '#22c55e', textAlign: 'center', fontWeight: 600 }}>
                            ✅ ¡Carga completada con éxito!
                        </div>
                    )}
                </div>

                <span className="upload-info" style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '4px', display: 'block', textAlign: 'right' }}>
                    {existingCount}/{maxFiles} archivos
                </span>
            </div>
        </div>
    );
}
