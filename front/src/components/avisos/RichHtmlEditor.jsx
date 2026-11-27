import React, { useRef, useState, useEffect } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    Link,
    Code,
    Eye,
    Minus,
    Palette,
    Info,
    AlertTriangle,
    CheckCircle,
    AlertOctagon,
    RemoveFormatting
} from 'lucide-react';
import './RichHtmlEditor.css';

export default function RichHtmlEditor({ value = '', onChange, placeholder = 'Redacte el aviso aquí con formato enriquecido...' }) {
    const editorRef = useRef(null);
    const [mode, setMode] = useState('visual'); // 'visual' | 'code'
    const [rawHtml, setRawHtml] = useState(value);

    // Sync external value to editor ref when changing from outside
    useEffect(() => {
        setRawHtml(value);
        if (editorRef.current && mode === 'visual') {
            if (editorRef.current.innerHTML !== value) {
                editorRef.current.innerHTML = value || '';
            }
        }
    }, [value, mode]);

    const handleInput = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            setRawHtml(html);
            if (onChange) onChange(html);
        }
    };

    const handleRawChange = (e) => {
        const val = e.target.value;
        setRawHtml(val);
        if (onChange) onChange(val);
    };

    const execCommand = (cmd, arg = null) => {
        if (mode !== 'visual') return;
        document.execCommand(cmd, false, arg);
        if (editorRef.current) {
            editorRef.current.focus();
            handleInput();
        }
    };

    const insertCallout = (type, title, defaultText) => {
        if (mode !== 'visual') return;
        const calloutHtml = `
            <div class="aviso-callout aviso-callout-${type}">
                <strong>${title}</strong>
                <span>${defaultText}</span>
            </div><p><br></p>
        `;
        execCommand('insertHTML', calloutHtml);
    };

    const handleAddLink = () => {
        const url = prompt('Ingrese el enlace URL (ej: https://...):', 'https://');
        if (url && url.trim()) {
            execCommand('createLink', url.trim());
        }
    };

    const handleColorClick = (color) => {
        execCommand('foreColor', color);
    };

    const handleBlockChange = (e) => {
        const val = e.target.value;
        if (val) {
            execCommand('formatBlock', `<${val}>`);
        }
    };

    return (
        <div className="rich-editor-container">
            {/* Toolbar */}
            <div className="rich-editor-toolbar">
                {/* Block Format Select */}
                <div className="toolbar-group">
                    <select
                        className="toolbar-select"
                        onChange={handleBlockChange}
                        defaultValue="p"
                        disabled={mode !== 'visual'}
                    >
                        <option value="p">Párrafo normal</option>
                        <option value="h1">Título Grande (H1)</option>
                        <option value="h2">Subtítulo (H2)</option>
                        <option value="h3">Encabezado Menor (H3)</option>
                    </select>
                </div>

                {/* Inline Formatting */}
                <div className="toolbar-group">
                    <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => execCommand('bold')}
                        title="Negrita (Ctrl+B)"
                        disabled={mode !== 'visual'}
                    >
                        <Bold size={15} />
                    </button>
                    <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => execCommand('italic')}
                        title="Cursiva (Ctrl+I)"
                        disabled={mode !== 'visual'}
                    >
                        <Italic size={15} />
                    </button>
                    <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => execCommand('underline')}
                        title="Subrayado (Ctrl+U)"
                        disabled={mode !== 'visual'}
                    >
                        <Underline size={15} />
                    </button>
                    <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => execCommand('strikeThrough')}
                        title="Tachado"
                        disabled={mode !== 'visual'}
                    >
                        <Strikethrough size={15} />
                    </button>
                </div>

                {/* Lists */}
                <div className="toolbar-group">
                    <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => execCommand('insertUnorderedList')}
                        title="Lista con viñetas"
                        disabled={mode !== 'visual'}
                    >
                        <List size={15} />
                    </button>
                    <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => execCommand('insertOrderedList')}
                        title="Lista numerada"
                        disabled={mode !== 'visual'}
                    >
                        <ListOrdered size={15} />
                    </button>
                </div>

                {/* Palette */}
                <div className="toolbar-group" title="Color de texto corporativo">
                    <button
                        type="button"
                        className="color-palette-btn"
                        style={{ backgroundColor: '#003594' }}
                        title="Azul Abastible"
                        onClick={() => handleColorClick('#003594')}
                        disabled={mode !== 'visual'}
                    />
                    <button
                        type="button"
                        className="color-palette-btn"
                        style={{ backgroundColor: '#FE5000' }}
                        title="Naranja Abastible"
                        onClick={() => handleColorClick('#FE5000')}
                        disabled={mode !== 'visual'}
                    />
                    <button
                        type="button"
                        className="color-palette-btn"
                        style={{ backgroundColor: '#16a34a' }}
                        title="Verde Conforme"
                        onClick={() => handleColorClick('#16a34a')}
                        disabled={mode !== 'visual'}
                    />
                    <button
                        type="button"
                        className="color-palette-btn"
                        style={{ backgroundColor: '#dc2626' }}
                        title="Rojo Alerta"
                        onClick={() => handleColorClick('#dc2626')}
                        disabled={mode !== 'visual'}
                    />
                    <button
                        type="button"
                        className="color-palette-btn"
                        style={{ backgroundColor: '#1e293b' }}
                        title="Texto Oscuro Principal"
                        onClick={() => handleColorClick('#1e293b')}
                        disabled={mode !== 'visual'}
                    />
                </div>

                {/* Callout Pre-formatted Boxes */}
                <div className="toolbar-group" title="Cajas de aviso destacadas">
                    <button
                        type="button"
                        className="callout-badge-btn info"
                        onClick={() => insertCallout('info', 'ℹ️ Información:', 'Mensaje informativo para los usuarios.')}
                        disabled={mode !== 'visual'}
                    >
                        <Info size={12} /> Info
                    </button>
                    <button
                        type="button"
                        className="callout-badge-btn warning"
                        onClick={() => insertCallout('warning', '⚠️ Atención:', 'Comunicado sobre fechas límite o precauciones.')}
                        disabled={mode !== 'visual'}
                    >
                        <AlertTriangle size={12} /> Aviso
                    </button>
                    <button
                        type="button"
                        className="callout-badge-btn danger"
                        onClick={() => insertCallout('danger', '🛑 Urgente:', 'Notificación crítica de cumplimiento o auditoría.')}
                        disabled={mode !== 'visual'}
                    >
                        <AlertOctagon size={12} /> Crítico
                    </button>
                </div>

                {/* Extra tools */}
                <div className="toolbar-group">
                    <button
                        type="button"
                        className="toolbar-btn"
                        onClick={handleAddLink}
                        title="Insertar Enlace URL"
                        disabled={mode !== 'visual'}
                    >
                        <Link size={15} />
                    </button>
                    <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => execCommand('insertHorizontalRule')}
                        title="Línea divisoria"
                        disabled={mode !== 'visual'}
                    >
                        <Minus size={15} />
                    </button>
                    <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => execCommand('removeFormat')}
                        title="Limpiar Formato"
                        disabled={mode !== 'visual'}
                    >
                        <RemoveFormatting size={15} />
                    </button>
                </div>

                {/* View Mode Toggle */}
                <div className="toolbar-group" style={{ marginLeft: 'auto', borderRight: 'none' }}>
                    <button
                        type="button"
                        className={`toolbar-btn ${mode === 'visual' ? 'active' : ''}`}
                        onClick={() => setMode('visual')}
                        title="Editor Visual"
                    >
                        <Eye size={14} style={{ marginRight: 4 }} /> Visual
                    </button>
                    <button
                        type="button"
                        className={`toolbar-btn ${mode === 'code' ? 'active' : ''}`}
                        onClick={() => setMode('code')}
                        title="Ver Código HTML"
                    >
                        <Code size={14} style={{ marginRight: 4 }} /> Código HTML
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="rich-editor-body">
                {mode === 'visual' ? (
                    <div
                        ref={editorRef}
                        className="rich-editable-area"
                        contentEditable
                        onInput={handleInput}
                        onBlur={handleInput}
                        data-placeholder={placeholder}
                        dangerouslySetInnerHTML={{ __html: rawHtml }}
                    />
                ) : (
                    <textarea
                        className="raw-html-textarea"
                        value={rawHtml}
                        onChange={handleRawChange}
                        placeholder="Pegue o edite código HTML aquí..."
                    />
                )}
            </div>

            {/* Status Footer */}
            <div className="editor-footer-status">
                <span>Modo: {mode === 'visual' ? 'Visual (WYSIWYG con formato embellecido)' : 'Código Fuente HTML'}</span>
                <span>Caracteres: {rawHtml.length}</span>
            </div>
        </div>
    );
}

