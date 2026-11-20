import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, X, ChevronLeft, ChevronRight, Check, Calendar, Users } from 'lucide-react';
import api from '../../api';
import './AvisoPopupModal.css';

export default function AvisoPopupModal({ forceOpen = false, previewAviso = null, onClose = null }) {
    const [avisos, setAvisos] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    // Load active avisos from API or preview
    const fetchActiveAvisos = useCallback(async () => {
        if (previewAviso) {
            setAvisos([previewAviso]);
            setCurrentIndex(0);
            setIsOpen(true);
            return;
        }

        try {
            const response = await api.get('/avisos/activos');
            const activeList = response.data?.data || [];
            if (activeList.length === 0) {
                setAvisos([]);
                setIsOpen(false);
                return;
            }

            setAvisos(activeList);

            // Check if user has already dismissed these avisos in this browser session
            const dismissedRaw = sessionStorage.getItem('dismissed_avisos_session');
            const dismissedIds = dismissedRaw ? JSON.parse(dismissedRaw) : [];

            // Find if there is at least one active aviso not dismissed yet
            const hasUnseen = activeList.some(a => !dismissedIds.includes(a.id));

            if (hasUnseen || forceOpen) {
                setCurrentIndex(0);
                setIsOpen(true);
            }
        } catch (error) {
            console.error('Error fetching active avisos for popup:', error);
        }
    }, [previewAviso, forceOpen]);

    useEffect(() => {
        fetchActiveAvisos();

        // Custom event listener so navbar or any button can trigger the modal
        const handleOpenEvent = (e) => {
            if (e.detail?.aviso) {
                setAvisos([e.detail.aviso]);
                setCurrentIndex(0);
            }
            setIsOpen(true);
        };

        window.addEventListener('open-avisos-modal', handleOpenEvent);
        return () => window.removeEventListener('open-avisos-modal', handleOpenEvent);
    }, [fetchActiveAvisos]);

    const handleClose = () => {
        // Mark all current avisos as dismissed for this session
        if (!previewAviso && avisos.length > 0) {
            try {
                const dismissedRaw = sessionStorage.getItem('dismissed_avisos_session');
                const dismissedIds = dismissedRaw ? JSON.parse(dismissedRaw) : [];
                const newIds = Array.from(new Set([...dismissedIds, ...avisos.map(a => a.id)]));
                sessionStorage.setItem('dismissed_avisos_session', JSON.stringify(newIds));
            } catch (e) {
                // ignore storage quota errors
            }
        }

        setIsOpen(false);
        if (onClose) onClose();
    };

    if (!isOpen || avisos.length === 0) return null;

    const currentAviso = avisos[currentIndex] || avisos[0];

    const handlePrev = () => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : avisos.length - 1));
    };

    const handleNext = () => {
        setCurrentIndex(prev => (prev < avisos.length - 1 ? prev + 1 : 0));
    };

    const formatDateStr = (dateStr) => {
        if (!dateStr) return '';
        try {
            const [y, m, d] = String(dateStr).split('-');
            return `${d}/${m}/${y}`;
        } catch (e) {
            return String(dateStr);
        }
    };

    return (
        <div className="aviso-modal-overlay" role="dialog" aria-modal="true">
            <div className="aviso-modal-dialog">
                {/* Corporate Header Stripe */}
                <div className="aviso-modal-stripes">
                    <div className="aviso-modal-stripe-blue" />
                    <div className="aviso-modal-stripe-orange" />
                </div>

                {/* Header */}
                <div className="aviso-modal-header">
                    <div className="aviso-header-left">
                        <div className="aviso-icon-badge">
                            <Megaphone size={24} />
                        </div>
                        <div className="aviso-title-area">
                            <div className="aviso-tag-pill">
                                <span>Comunicado Oficial</span>
                                {avisos.length > 1 && (
                                    <span style={{ color: '#FE5000', fontWeight: 600 }}>
                                        • ({currentIndex + 1} de {avisos.length})
                                    </span>
                                )}
                            </div>
                            <h2 className="aviso-modal-title">{currentAviso.titulo}</h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="aviso-modal-close-btn"
                        onClick={handleClose}
                        title="Cerrar comunicado"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Meta Bar */}
                <div className="aviso-meta-bar" style={{ margin: '0 24px', marginTop: 12 }}>
                    <div className="aviso-meta-item">
                        <Calendar size={14} style={{ color: '#003594' }} />
                        <span>
                            Vigencia: <strong>{formatDateStr(currentAviso.fecha_desde)}</strong> al{' '}
                            <strong>{formatDateStr(currentAviso.fecha_hasta)}</strong>
                        </span>
                    </div>
                    <div className="aviso-meta-item">
                        <Users size={14} style={{ color: '#FE5000' }} />
                        <span>
                            {currentAviso.para_todos
                                ? 'Visible para todos los usuarios'
                                : `Roles: ${Array.isArray(currentAviso.roles) ? currentAviso.roles.join(', ') : 'Segmentado'}`}
                        </span>
                    </div>
                </div>

                {/* Body (HTML formatted) */}
                <div className="aviso-modal-body">
                    <div
                        className="aviso-html-content"
                        dangerouslySetInnerHTML={{ __html: currentAviso.contenido }}
                    />
                </div>

                {/* Footer */}
                <div className="aviso-modal-footer">
                    {avisos.length > 1 ? (
                        <div className="aviso-carousel-controls">
                            <button
                                type="button"
                                className="aviso-nav-btn"
                                onClick={handlePrev}
                                title="Anterior comunicado"
                            >
                                <ChevronLeft size={16} /> Anterior
                            </button>
                            <span>
                                {currentIndex + 1} / {avisos.length}
                            </span>
                            <button
                                type="button"
                                className="aviso-nav-btn"
                                onClick={handleNext}
                                title="Siguiente comunicado"
                            >
                                Siguiente <ChevronRight size={16} />
                            </button>
                        </div>
                    ) : (
                        <div />
                    )}

                    <button
                        type="button"
                        className="aviso-dismiss-btn"
                        onClick={handleClose}
                    >
                        <Check size={16} /> Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}

