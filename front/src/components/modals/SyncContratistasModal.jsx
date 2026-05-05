import React, { useState, useEffect } from 'react';
import api from '../../api';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';

const SyncContratistasModal = ({ isOpen, onClose, onSyncComplete }) => {
    const [step, setStep] = useState(0); // 0: Review Services, 1: Dependencias, 2: Contratistas, 3: Vinculaciones
    const [loading, setLoading] = useState(false);
    const [diffData, setDiffData] = useState(null);
    const [syncing, setSyncing] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8; // Adjust to fit screen nicely

    useEffect(() => {
        if (isOpen) {
            fetchComparison();
        } else {
            setStep(0);
            setDiffData(null);
            setCurrentPage(1);
        }
    }, [isOpen]);

    // Reset pagination when step changes or data loads
    useEffect(() => {
        setCurrentPage(1);
    }, [step, diffData]);

    const fetchComparison = async () => {
        setLoading(true);
        try {
            const response = await api.get('/sync/compare');
            setDiffData(response.data);
        } catch (error) {
            console.error('Error fetching sync data:', error);
            toast.error('Error al obtener datos para sincronización');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async (type, items) => {
        setSyncing(true);
        try {
            await api.post('/sync/execute', { type, items });
            toast.success(`${type} sincronizados correctamente`);

            // Refresh comparison to update status
            await fetchComparison();
        } catch (error) {
            console.error('Error syncing:', error);
            toast.error('Error al sincronizar datos');
        } finally {
            setSyncing(false);
        }
    };

    const steps = [
        { label: 'Gerencias', key: 'gerencias', title: 'Paso 1: Sincronizar Gerencias' },
        { label: 'Subgerencias', key: 'subgerencias', title: 'Paso 2: Sincronizar Subgerencias' },
        { label: 'Servicios', key: 'servicios', title: 'Paso 3: Sincronizar Servicios' },
        { label: 'Dependencias', key: 'dependencias', title: 'Paso 4: Sincronizar Dependencias' },
        { label: 'Contratistas', key: 'contratistas', title: 'Paso 5: Sincronizar Contratistas' },
        { label: 'Contratista Admin', key: 'contratista_admin', title: 'Paso 6: Sincronizar Admins de Contratistas' },
        { label: 'Vinculaciones', key: 'vinculaciones', title: 'Paso 7: Sincronizar Vinculaciones' },
        { label: 'Admin Contratos', key: 'administrador_contrato', title: 'Paso 8: Sincronizar Admins de Contratos' }
    ];

    const currentKey = steps[step]?.key;
    const currentItems = diffData ? diffData[currentKey] : [];
    const newItems = currentItems.filter(i => i.estado === 'new' || i.estado === 'updated');
    const existingItems = currentItems.filter(i => i.estado === 'exists');

    // Pagination Logic
    const totalPages = Math.ceil(currentItems.length / itemsPerPage);
    const paginatedItems = currentItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Helper for dates
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-CL');
    };

    const renderTable = () => {
        if (!diffData) return <p>Cargando datos...</p>;

        return (
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <span className="font-bold text-lg">Nuevos: {newItems.length}</span>
                        <span className="ml-4 text-gray-500">Existentes: {existingItems.length}</span>
                    </div>
                    {newItems.length > 0 && (
                        <button
                            onClick={() => handleSync(currentKey, newItems)}
                            disabled={syncing}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {syncing ? 'Sincronizando...' : `Sincronizar Todo (${newItems.length})`}
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-auto bg-white border rounded">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3">
                                    {currentKey === 'contratista_admin' || currentKey === 'administrador_contrato' ? 'Nombre / Email' : 'Nombre / RUT'}
                                </th>
                                {currentKey === 'subgerencias' && <th className="px-6 py-3">Gerencia</th>}
                                {currentKey === 'servicios' && <th className="px-6 py-3">Subgerencia</th>}
                                {currentKey === 'vinculaciones' && (
                                    <>
                                        <th className="px-6 py-3">Jerarquía</th>
                                        <th className="px-6 py-3">N° Contrato</th>
                                        <th className="px-6 py-3">Fechas</th>
                                    </>
                                )}
                                <th className="px-6 py-3 text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.map((item, idx) => (
                                <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {currentKey === 'contratistas' ? `${item.nombre} (${item.rut})` :
                                         currentKey === 'contratista_admin' || currentKey === 'administrador_contrato' ? `${item.nombre} (${item.email})` :
                                         currentKey === 'vinculaciones' ? `${item.contratista} (${item.rut_contratista})` : item.nombre}
                                    </td>
                                    {currentKey === 'subgerencias' && <td className="px-6 py-4">{item.gerencia}</td>}
                                    {currentKey === 'servicios' && <td className="px-6 py-4">{item.subgerencia}</td>}
                                    {currentKey === 'vinculaciones' && (
                                        <>
                                            <td className="px-6 py-4 text-xs">
                                                <div><strong>G:</strong> {item.gerencia}</div>
                                                <div><strong>SG:</strong> {item.subgerencia}</div>
                                                <div><strong>S:</strong> {item.servicio}</div>
                                                <div><strong>D:</strong> {item.dependencia}</div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm">
                                                {item.estado === 'updated' ? (
                                                    <span className="text-blue-600 font-bold">{item.numero_contrato || '-'}</span>
                                                ) : (
                                                    item.numero_contrato || '-'
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs whitespace-nowrap">
                                                <div><strong>Inicio:</strong> {formatDate(item.fecha_inicio_contrato)}</div>
                                                <div><strong>Fin:</strong> {item.fecha_termino_contrato ? formatDate(item.fecha_termino_contrato) : <span className="text-gray-400 italic">Indefinido</span>}</div>
                                            </td>
                                        </>
                                    )}
                                    <td className="px-6 py-4 text-right">
                                        {item.estado === 'new' ? (
                                            <span className="text-orange-600 font-bold">Nuevo</span>
                                        ) : item.estado === 'updated' ? (
                                            <span className="text-blue-600 font-bold">Desactualizado</span>
                                        ) : (
                                            <span className="text-green-600">Existe</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {paginatedItems.length === 0 && (
                                <tr>
                                    <td colSpan={currentKey === 'vinculaciones' ? 7 : 2} className="px-6 py-4 text-center">
                                        No hay datos para mostrar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border rounded text-xs disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <span className="text-xs text-gray-500">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border rounded text-xs disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Sincronizar Contratistas (Oval Control)"
            maxWidth="max-w-5xl"
            padding="p-0"
        >
            {loading ? (
                <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Obteniendo datos de API externa...</p>
                </div>
            ) : (
                <div className="flex flex-col" style={{ minHeight: '600px', maxHeight: '85vh' }}>
                    {/* Stepper (Fixed Top) */}
                    <div className="p-4 border-b shrink-0">
                        <div className="flex justify-between mb-4">
                            {steps.map((s, idx) => (
                                <div key={idx} className={`flex items-center ${idx === step ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 border-2 ${idx === step ? 'border-blue-600' : 'border-gray-300'}`}>
                                        {idx + 1}
                                    </div>
                                    <span>{s.label}</span>
                                    {idx < steps.length - 1 && <div className="mx-4 h-0.5 w-10 bg-gray-200" />}
                                </div>
                            ))}
                        </div>
                        <h3 className="text-xl font-bold">{steps[step]?.title}</h3>
                    </div>

                    {/* Content (Pagination area) */}
                    <div className="flex-1 p-4 min-h-0">
                        {renderTable()}
                    </div>

                    {/* Footer Actions (Fixed Bottom) */}
                    <div className="p-4 border-t border-gray-200 bg-white shrink-0 flex justify-between">
                        <button
                            onClick={() => setStep(prev => Math.max(0, prev - 1))}
                            disabled={step === 0}
                            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                        >
                            Anterior
                        </button>

                        {step < steps.length - 1 ? (
                            <button
                                onClick={() => setStep(prev => prev + 1)}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Siguiente
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    onSyncComplete && onSyncComplete();
                                    onClose();
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Finalizar
                            </button>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default SyncContratistasModal;
