import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

/**
 * SearchableSelect Component
 * A premium select component with autocomplete/search functionality.
 */
export default function SearchableSelect({
    label,
    options = [],
    value,
    onChange,
    placeholder = "Seleccione...",
    disabled = false,
    icon: Icon
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef(null);

    // Filter options based on search term
    const filteredOptions = options.filter(opt =>
        (opt.nombre || opt.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get current label
    const selectedOption = options.find(opt => String(opt.id) === String(value));
    const currentLabel = selectedOption ? (selectedOption.nombre || selectedOption.name) : placeholder;

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionId) => {
        onChange(optionId);
        setIsOpen(false);
        setSearchTerm("");
    };

    return (
        <div ref={containerRef} style={{ flex: '1 1 200px', minWidth: '150px', position: 'relative' }}>
            {label && (
                <label style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '11px', fontWeight: 600, color: '#64748b',
                    marginBottom: '6px', textTransform: 'uppercase'
                }}>
                    {Icon && <Icon size={12} className="text-slate-400" />}
                    {label}
                </label>
            )}

            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: selectedOption ? '#1e293b' : '#94a3b8',
                    background: disabled ? '#f1f5f9' : '#fff',
                    border: isOpen ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    minHeight: '38px'
                }}
            >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
                    {currentLabel}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selectedOption && !disabled && (
                        <X
                            size={14}
                            style={{ color: '#94a3b8' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect('todos');
                            }}
                        />
                    )}
                    <ChevronDown size={14} style={{ color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
            </div>

            {/* Dropdown List */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    background: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.15s ease-out'
                }}>
                    {/* Search Input */}
                    <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Search size={14} className="text-slate-400" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                border: 'none',
                                outline: 'none',
                                fontSize: '13px',
                                color: '#1e293b'
                            }}
                        />
                    </div>

                    {/* Options List */}
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        <div
                            onClick={() => handleSelect('todos')}
                            style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                background: value === 'todos' ? '#eff6ff' : 'transparent',
                                color: value === 'todos' ? '#2563eb' : '#475569',
                                fontWeight: value === 'todos' ? 600 : 400,
                            }}
                            className="hover:bg-slate-50"
                        >
                            Todos
                        </div>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div
                                    key={opt.id}
                                    onClick={() => handleSelect(opt.id)}
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        background: String(value) === String(opt.id) ? '#eff6ff' : 'transparent',
                                        color: String(value) === String(opt.id) ? '#2563eb' : '#475569',
                                        fontWeight: String(value) === String(opt.id) ? 600 : 400,
                                    }}
                                    className="hover:bg-slate-50"
                                >
                                    {opt.nombre || opt.name}
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                No se encontraron resultados
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .hover\\:bg-slate-50:hover {
                    background-color: #f8fafc !important;
                }
            `}</style>
        </div>
    );
}
