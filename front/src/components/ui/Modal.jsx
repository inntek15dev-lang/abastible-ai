import { Modal as AriaModal, ModalOverlay, Dialog, Heading } from 'react-aria-components';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-md', padding = 'p-6', noHeader = false }) {
    return (
        <ModalOverlay
            isOpen={isOpen}
            onOpenChange={(isOpen) => !isOpen && onClose()}
            className="modal-overlay"
            isDismissable
        >
            <AriaModal className={`modal-panel ${maxWidth} ${padding} react-aria-modal`}>
                <Dialog className="modal-dialog outline-none">
                    {({ close }) => (
                        <>
                            {!noHeader && (
                                <div className="modal-header" style={{
                                    marginBottom: '20px',
                                    borderBottom: '1px solid #f1f5f9',
                                    paddingBottom: '16px',
                                    marginRight: '-6px' // compensate close btn padding
                                }}>
                                    <Heading slot="title" className="modal-title" style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 600,
                                        color: '#0f172a',
                                        letterSpacing: '-0.025em'
                                    }}>
                                        {title}
                                    </Heading>
                                    <button
                                        onClick={close}
                                        className="modal-close-btn"
                                        style={{ color: '#94a3b8' }}
                                    >
                                        <X size={24} strokeWidth={2} />
                                    </button>
                                </div>
                            )}

                            <div className="modal-content">
                                {children}
                            </div>

                            {footer && (
                                <div className="modal-footer" style={{
                                    marginTop: '24px',
                                    paddingTop: '20px',
                                    borderTop: '1px solid #f1f5f9',
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '12px'
                                }}>
                                    {footer}
                                </div>
                            )}
                        </>
                    )}
                </Dialog>
            </AriaModal>
        </ModalOverlay>
    );
}
