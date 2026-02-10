// IEEE Trace: US-012 | pages/licitaciones/PostulacionList.jsx
import { useState, useEffect } from 'react';
import api from '../../api';
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function PostulacionList() {
    const [postulaciones, setPostulaciones] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPostulaciones();
    }, []);

    const fetchPostulaciones = async () => {
        try {
            const response = await api.get('/mis-postulaciones');
            setPostulaciones(response.data.data);
        } catch (error) {
            console.error('Error fetching postulaciones:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            enviada: { color: 'text-blue-600 bg-blue-50', icon: Clock },
            aceptada: { color: 'text-green-600 bg-green-50', icon: CheckCircle },
            rechazada: { color: 'text-red-600 bg-red-50', icon: XCircle }
        };
        const style = config[status] || config.enviada;
        const Icon = style.icon;

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${style.color}`}>
                <Icon size={12} />
                {status.toUpperCase()}
            </span>
        );
    };

    if (loading) return <div className="p-4">Cargando...</div>;

    return (
        <div className="page-container">
            <header className="page-header mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="text-orange-600" />
                    Mis Postulaciones
                </h1>
            </header>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">Licitación</th>
                            <th className="p-4 font-semibold text-gray-600">Fecha Cierre</th>
                            <th className="p-4 font-semibold text-gray-600">Oferta ($)</th>
                            <th className="p-4 font-semibold text-gray-600">Oferta Técnica</th>
                            <th className="p-4 font-semibold text-gray-600">Estado</th>
                            <th className="p-4 font-semibold text-gray-600">Fecha Envío</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {postulaciones.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    No has realizado postulaciones aún.
                                </td>
                            </tr>
                        ) : (
                            postulaciones.map((post) => (
                                <tr key={post.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-900">
                                        {post.licitacion?.titulo || 'Licitación Desconocida'}
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        {new Date(post.licitacion?.fecha_fin).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 font-mono text-gray-700">
                                        ${parseInt(post.oferta_economica).toLocaleString('es-CL')}
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {post.oferta_tecnica}
                                    </td>
                                    <td className="p-4">
                                        {getStatusBadge(post.estado)}
                                    </td>
                                    <td className="p-4 text-gray-500 text-sm">
                                        {new Date(post.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
