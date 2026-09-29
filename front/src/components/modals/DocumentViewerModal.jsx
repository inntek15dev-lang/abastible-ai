// IEEE Trace: REQ-005 | components/modals/DocumentViewerModal.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import api from '../../api';
import {
    X,
    Download,
    FileText,
    FileImage,
    FileSpreadsheet,
    FileVideo,
    FileAudio,
    FileBox,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Search,
    AlertCircle,
    Loader2
} from 'lucide-react';
import './DocumentViewerModal.css';

// PDF Sub-component using pdfjs-dist Canvas rendering
function PdfViewer({ pdfBuffer, downloadUrl, fileName }) {
    const canvasRef = useRef(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [pageNum, setPageNum] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.25);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!pdfBuffer || pdfBuffer.byteLength === 0) return;
        let isMounted = true;
        setLoading(true);
        setError('');

        const loadPdf = async () => {
            try {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
                
                // Copy ArrayBuffer so PDF.js worker doesn't detach original buffer
                const copyBuffer = pdfBuffer.slice(0);
                const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(copyBuffer) });
                const pdf = await loadingTask.promise;
                
                if (isMounted) {
                    setPdfDoc(pdf);
                    setNumPages(pdf.numPages);
                    setPageNum(1);
                }
            } catch (err) {
                console.error('PDFjs load error:', err);
                if (isMounted) {
                    setError('El archivo PDF posee una estructura no válida o corrupta. Puedes descargarlo directamente con el botón a continuación.');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadPdf();
        return () => { isMounted = false; };
    }, [pdfBuffer]);

    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;
        let isMounted = true;

        const renderPage = async () => {
            try {
                const page = await pdfDoc.getPage(pageNum);
                if (!isMounted || !canvasRef.current) return;

                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                await page.render(renderContext).promise;
            } catch (err) {
                console.error('PDF page render error:', err);
            }
        };

        renderPage();
        return () => { isMounted = false; };
    }, [pdfDoc, pageNum, scale]);

    if (loading) {
        return (
            <div className="cinema-loading-state">
                <Loader2 className="spin" size={36} color="#003594" />
                <span>Cargando documento PDF de alta fidelidad...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="cinema-fallback-card">
                <AlertCircle size={64} color="#ef4444" />
                <h3>No se pudo previsualizar el PDF</h3>
                <p style={{ maxWidth: '400px', margin: '0 auto 16px auto', color: '#475569' }}>{error}</p>
                <a href={downloadUrl} download={fileName} className="btn-cinema-download-large">
                    <Download size={18} /> Descargar {fileName}
                </a>
            </div>
        );
    }

    return (
        <div className="pdf-viewer-container">
            {/* PDF Control Bar */}
            <div className="pdf-controls">
                <div className="pdf-nav-controls">
                    <button
                        className="btn-pdf-control"
                        disabled={pageNum <= 1}
                        onClick={() => setPageNum(p => Math.max(1, p - 1))}
                    >
                        ◀ Anterior
                    </button>
                    <span className="pdf-page-info">
                        Página <strong>{pageNum}</strong> de <strong>{numPages}</strong>
                    </span>
                    <button
                        className="btn-pdf-control"
                        disabled={pageNum >= numPages}
                        onClick={() => setPageNum(p => Math.min(numPages, p + 1))}
                    >
                        Siguiente ▶
                    </button>
                </div>
                <div className="pdf-zoom-controls">
                    <button className="btn-pdf-control" onClick={() => setScale(s => Math.max(0.5, s - 0.25))} title="Alejar">
                        <ZoomOut size={14} />
                    </button>
                    <span className="pdf-scale-info">{Math.round(scale * 100)}%</span>
                    <button className="btn-pdf-control" onClick={() => setScale(s => Math.min(3, s + 0.25))} title="Acercar">
                        <ZoomIn size={14} />
                    </button>
                </div>
            </div>

            {/* Canvas Scroll Wrapper */}
            <div className="pdf-canvas-scroll">
                <canvas ref={canvasRef} className="pdf-canvas" />
            </div>
        </div>
    );
}

export default function DocumentViewerModal({
    isOpen,
    onClose,
    fileUrl,
    fileName = 'archivo.dat',
    fileTitle = null
}) {
    // Image Viewer state
    const [zoom, setZoom] = useState(1);

    // Generic Buffer & Blob State
    const [fileBuffer, setFileBuffer] = useState(null);
    const [blobUrl, setBlobUrl] = useState('');
    const [loadingFile, setLoadingFile] = useState(false);
    const [fileError, setFileError] = useState('');

    // DOCX Viewer state
    const [docxHtml, setDocxHtml] = useState('');
    const [loadingDocx, setLoadingDocx] = useState(false);

    // Excel Viewer state
    const [workbook, setWorkbook] = useState(null);
    const [activeSheet, setActiveSheet] = useState('');
    const [excelSearch, setExcelSearch] = useState('');
    const [loadingExcel, setLoadingExcel] = useState(false);
    const [excelError, setExcelError] = useState('');

    // Text File state
    const [textContent, setTextContent] = useState('');

    const getFileExtension = (name) => {
        if (!name) return '';
        const parts = name.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    };

    const fileExt = useMemo(() => getFileExtension(fileName), [fileName]);

    const category = useMemo(() => {
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileExt)) return 'image';
        if (['pdf'].includes(fileExt)) return 'pdf';
        if (['xls', 'xlsx', 'csv', 'ods'].includes(fileExt)) return 'excel';
        if (['doc', 'docx', 'rtf', 'txt'].includes(fileExt)) return 'document';
        if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(fileExt)) return 'video';
        if (['mp3', 'wav', 'ogg', 'm4a'].includes(fileExt)) return 'audio';
        return 'other';
    }, [fileExt]);

    // Main loader effect
    useEffect(() => {
        if (!isOpen || !fileUrl) {
            setZoom(1);
            setFileBuffer(null);
            setBlobUrl('');
            setLoadingFile(false);
            setFileError('');
            setDocxHtml('');
            setLoadingDocx(false);
            setWorkbook(null);
            setActiveSheet('');
            setExcelSearch('');
            setExcelError('');
            setTextContent('');
            return;
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);

        let activeBlobUrl = null;

        const loadAuthenticatedBinary = async () => {
            try {
                setLoadingFile(true);
                setFileError('');

                const fetchUrl = fileUrl.startsWith('http')
                    ? fileUrl
                    : (fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`);

                // Always fetch binary ArrayBuffer with Axios auth headers
                const response = await api.get(fetchUrl, { responseType: 'arraybuffer' });
                const buffer = response.data;
                setFileBuffer(buffer);

                // Handle DOCX conversion via mammoth
                if (['docx', 'doc'].includes(fileExt)) {
                    try {
                        setLoadingDocx(true);
                        const result = await mammoth.convertToHtml({ arrayBuffer: buffer.slice(0) });
                        setDocxHtml(result.value || '<p><em>Documento sin contenido de texto reconocible.</em></p>');
                    } catch (docxErr) {
                        console.warn('Mammoth docx conversion warning:', docxErr);
                    } finally {
                        setLoadingDocx(false);
                    }
                }

                // Handle TXT / Log / JSON
                if (['txt', 'log', 'json'].includes(fileExt)) {
                    const decoder = new TextDecoder('utf-8');
                    setTextContent(decoder.decode(buffer));
                }

                // Determine Mime Type
                let mimeType = 'application/octet-stream';
                if (fileExt === 'pdf') mimeType = 'application/pdf';
                else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fileExt)) {
                    mimeType = fileExt === 'svg' ? 'image/svg+xml' : `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
                } else if (['mp4', 'webm'].includes(fileExt)) mimeType = `video/${fileExt}`;
                else if (['mp3', 'wav'].includes(fileExt)) mimeType = `audio/${fileExt}`;

                // Create Blob from ArrayBuffer for images, video, audio, download
                const blob = new Blob([buffer], { type: mimeType });
                activeBlobUrl = URL.createObjectURL(blob);
                setBlobUrl(activeBlobUrl);

            } catch (err) {
                console.error('Error fetching file binary:', err);
                setFileError('No se pudo cargar la vista previa directa. Puedes descargar el archivo desde el botón superior.');
            } finally {
                setLoadingFile(false);
            }
        };

        if (category === 'excel') {
            loadExcelFile(fileUrl);
        } else {
            loadAuthenticatedBinary();
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (activeBlobUrl) {
                URL.revokeObjectURL(activeBlobUrl);
            }
        };
    }, [isOpen, fileUrl, fileName, category, fileExt]);

    // Load Excel File using SheetJS
    const loadExcelFile = async (url) => {
        try {
            setLoadingExcel(true);
            setExcelError('');

            const fetchUrl = url.startsWith('http') ? url : (url.startsWith('/') ? url : `/${url}`);
            const response = await api.get(fetchUrl, { responseType: 'arraybuffer' });

            const data = new Uint8Array(response.data);
            const wb = XLSX.read(data, { type: 'array' });

            setWorkbook(wb);
            if (wb.SheetNames && wb.SheetNames.length > 0) {
                setActiveSheet(wb.SheetNames[0]);
            }
        } catch (err) {
            console.error('Error loading Excel file:', err);
            setExcelError('No se pudo procesar la plantilla de cálculo en el visor. Puedes descargar el archivo directamente.');
        } finally {
            setLoadingExcel(false);
        }
    };

    // Convert Active Excel Sheet to Table Data
    const sheetData = useMemo(() => {
        if (!workbook || !activeSheet || !workbook.Sheets[activeSheet]) return [];
        const worksheet = workbook.Sheets[activeSheet];
        return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    }, [workbook, activeSheet]);

    // Filtered Sheet Rows
    const filteredRows = useMemo(() => {
        if (!sheetData || sheetData.length === 0) return [];
        if (!excelSearch.trim()) return sheetData;

        const term = excelSearch.toLowerCase();
        return sheetData.filter((row, idx) => {
            if (idx === 0) return true; // Keep header row
            return row.some(cell => String(cell).toLowerCase().includes(term));
        });
    }, [sheetData, excelSearch]);

    if (!isOpen) return null;

    // Direct Download URL
    const downloadUrl = blobUrl || (fileUrl ? (fileUrl.startsWith('http') ? fileUrl : (fileUrl.startsWith('/') ? `${api.defaults.baseURL}${fileUrl}` : `${api.defaults.baseURL}/${fileUrl}`)) : '#');

    return (
        <div className="cinema-modal-overlay" onClick={onClose}>
            <div className="cinema-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header Bar */}
                <div className="cinema-header">
                    <div className="cinema-header-info">
                        <div className="cinema-icon-badge">
                            {category === 'image' && <FileImage size={18} color="#3b82f6" />}
                            {category === 'pdf' && <FileText size={18} color="#ef4444" />}
                            {category === 'excel' && <FileSpreadsheet size={18} color="#10b981" />}
                            {category === 'document' && <FileText size={18} color="#003594" />}
                            {category === 'video' && <FileVideo size={18} color="#f59e0b" />}
                            {category === 'audio' && <FileAudio size={18} color="#8b5cf6" />}
                            {category === 'other' && <FileBox size={18} color="#d97706" />}
                        </div>
                        <div className="cinema-title-box">
                            <div className="cinema-filename">
                                {fileName}
                                <span className="cinema-ext-badge">{fileExt.toUpperCase()}</span>
                            </div>
                            {fileTitle && <div className="cinema-subtitle">{fileTitle}</div>}
                        </div>
                    </div>

                    {/* Header Controls */}
                    <div className="cinema-header-actions">
                        {category === 'image' && (
                            <div className="cinema-zoom-controls">
                                <button className="btn-cinema-icon" onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))} title="Alejar">
                                    <ZoomOut size={16} />
                                </button>
                                <span className="zoom-value">{Math.round(zoom * 100)}%</span>
                                <button className="btn-cinema-icon" onClick={() => setZoom(prev => Math.min(3, prev + 0.25))} title="Acercar">
                                    <ZoomIn size={16} />
                                </button>
                                <button className="btn-cinema-icon" onClick={() => setZoom(1)} title="Restablecer">
                                    <RotateCcw size={14} />
                                </button>
                            </div>
                        )}

                        <a
                            href={downloadUrl}
                            download={fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-cinema-download"
                            title="Descargar archivo original"
                        >
                            <Download size={15} />
                            <span>Descargar</span>
                        </a>

                        <button className="btn-cinema-close" onClick={onClose} title="Cerrar (Esc)">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Content Body */}
                <div className="cinema-body">
                    {loadingFile && category !== 'excel' ? (
                        <div className="cinema-loading-state">
                            <Loader2 className="spin" size={36} color="#003594" />
                            <span>Cargando documento en alta resolución...</span>
                        </div>
                    ) : fileError && category !== 'excel' ? (
                        <div className="cinema-error-state">
                            <AlertCircle size={36} color="#ef4444" />
                            <p>{fileError}</p>
                            <a href={downloadUrl} download={fileName} className="btn-cinema-download-large">
                                <Download size={18} /> Descargar {fileName}
                            </a>
                        </div>
                    ) : (
                        <>
                            {/* 1. IMAGE VIEWER */}
                            {category === 'image' && (
                                <div className="cinema-image-wrapper">
                                    {blobUrl ? (
                                        <img
                                            src={blobUrl}
                                            alt={fileName}
                                            className="cinema-image"
                                            style={{ transform: `scale(${zoom})` }}
                                        />
                                    ) : (
                                        <div className="cinema-loading-state">
                                            <Loader2 className="spin" size={32} color="#3b82f6" />
                                            <span>Procesando imagen...</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 2. PDF VIEWER (PDFjs Canvas Engine) */}
                            {category === 'pdf' && (
                                <PdfViewer pdfBuffer={fileBuffer} downloadUrl={downloadUrl} fileName={fileName} />
                            )}

                            {/* 3. EXCEL / SPREADSHEET VIEWER */}
                            {category === 'excel' && (
                                <div className="cinema-excel-wrapper">
                                    {loadingExcel ? (
                                        <div className="cinema-loading-state">
                                            <Loader2 className="spin" size={32} color="#3b82f6" />
                                            <span>Cargando y procesando la plantilla de cálculo...</span>
                                        </div>
                                    ) : excelError ? (
                                        <div className="cinema-error-state">
                                            <AlertCircle size={36} color="#ef4444" />
                                            <p>{excelError}</p>
                                            <a href={downloadUrl} download={fileName} className="btn-cinema-download-large">
                                                <Download size={18} /> Descargar {fileName}
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="cinema-excel-container">
                                            {/* Excel Toolbar */}
                                            <div className="excel-toolbar">
                                                {/* Sheet Tabs */}
                                                <div className="excel-tabs">
                                                    {workbook?.SheetNames?.map(sheetName => (
                                                        <button
                                                            key={sheetName}
                                                            className={`excel-tab ${activeSheet === sheetName ? 'active' : ''}`}
                                                            onClick={() => setActiveSheet(sheetName)}
                                                        >
                                                            <FileSpreadsheet size={13} />
                                                            {sheetName}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Search Box */}
                                                <div className="excel-search-box">
                                                    <Search size={14} className="search-icon" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar en la planilla..."
                                                        value={excelSearch}
                                                        onChange={(e) => setExcelSearch(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Excel Table View */}
                                            <div className="excel-table-scroll">
                                                {filteredRows.length > 0 ? (
                                                    <table className="excel-table">
                                                        <thead>
                                                            <tr>
                                                                <th className="row-number-header">#</th>
                                                                {(filteredRows[0] || []).map((col, cIdx) => (
                                                                    <th key={cIdx}>{col || `Col ${cIdx + 1}`}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredRows.slice(1).map((row, rIdx) => (
                                                                <tr key={rIdx}>
                                                                    <td className="row-number-cell">{rIdx + 1}</td>
                                                                    {(filteredRows[0] || []).map((_, cIdx) => (
                                                                        <td key={cIdx}>{row[cIdx] !== undefined ? String(row[cIdx]) : ''}</td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div className="excel-empty-state">
                                                        <span>No se encontraron filas coincidentes en esta hoja.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 4. DOCUMENT / TEXT VIEWER */}
                            {category === 'document' && (
                                <div className="cinema-doc-wrapper">
                                    {['txt', 'log', 'json'].includes(fileExt) ? (
                                        <pre className="cinema-text-reader">{textContent}</pre>
                                    ) : loadingDocx ? (
                                        <div className="cinema-loading-state">
                                            <Loader2 className="spin" size={32} color="#003594" />
                                            <span>Procesando vista de lectura Word (.docx)...</span>
                                        </div>
                                    ) : docxHtml ? (
                                        <div className="cinema-docx-container">
                                            <div
                                                className="cinema-docx-paper"
                                                dangerouslySetInnerHTML={{ __html: docxHtml }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="cinema-fallback-card">
                                            <FileText size={64} color="#003594" />
                                            <h3>{fileName}</h3>
                                            <p style={{ maxWidth: '400px', margin: '0 auto 16px auto', color: '#64748b' }}>
                                                Documento Microsoft Word ({fileExt.toUpperCase()}). Haz clic en el botón a continuación para descargarlo.
                                            </p>
                                            <a href={downloadUrl} download={fileName} className="btn-cinema-download-large">
                                                <Download size={18} /> Descargar {fileName}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 5. VIDEO VIEWER */}
                            {category === 'video' && (
                                <div className="cinema-media-wrapper">
                                    <video controls autoPlay className="cinema-video-player">
                                        <source src={blobUrl} />
                                        Tu navegador no soporta la reproducción de video.
                                    </video>
                                </div>
                            )}

                            {/* 6. AUDIO VIEWER */}
                            {category === 'audio' && (
                                <div className="cinema-media-wrapper audio">
                                    <FileAudio size={64} color="#8b5cf6" />
                                    <audio controls autoPlay className="cinema-audio-player">
                                        <source src={blobUrl} />
                                        Tu navegador no soporta la reproducción de audio.
                                    </audio>
                                </div>
                            )}

                            {/* 7. OTHER / ARCHIVE / BINARY FALLBACK */}
                            {category === 'other' && (
                                <div className="cinema-fallback-card">
                                    <FileBox size={64} color="#0284c7" />
                                    <h3>{fileName}</h3>
                                    <p>Vista previa no disponible directamente para este tipo de archivo (.${fileExt}).</p>
                                    <a href={downloadUrl} download={fileName} className="btn-cinema-download-large">
                                        <Download size={18} /> Descargar {fileName}
                                    </a>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
