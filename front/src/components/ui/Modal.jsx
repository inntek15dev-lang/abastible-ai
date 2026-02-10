import { Modal as AriaModal, ModalOverlay, Dialog, Heading } from 'react-aria-components';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-md', padding = 'p-6', noHeader = false }) {
    return (
        <ModalOverlay
            isOpen={isOpen}
            onOpenChange={(isOpen) => !isOpen && onClose()}
            className="modal-overlay"
        >
            <AriaModal className={`modal-panel ${maxWidth} ${padding}`}>
                <Dialog className="modal-dialog">
                    {({ close }) => (
                        <>
                            {!noHeader && (
                                <div className="modal-header">
                                    <Heading slot="title" className="modal-title">
                                        {title}
                                    </Heading>
                                    <button
                                        onClick={close}
                                        className="modal-close-btn"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            )}

                            <div>
                                {children}
                            </div>

                            {footer && (
                                <div className="modal-footer">
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
