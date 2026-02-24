// IEEE Trace: REQ-008 | US-008, Sprint 4 | pages/reportes/ReporteList.jsx
import { useState, useEffect } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Reportes.css';

export default function ReporteList() {
    const { canRead } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!canRead('Reportes')) {
            navigate('/');
        }
    }, [canRead, navigate]);


    const [loading, setLoading] = useState(true);
    const [filterPeriodo, setFilterPeriodo] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        if (!canRead('Reportes')) {
            navigate('/');
            return;
        }
        fetchData();
    }, [canRead, navigate, filterPeriodo]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:4000/api/reportes/cumplimiento?periodo=${filterPeriodo}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming token storage
                }
            });
            const data = await response.json();


        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
        }
    };




    return (
        <div className="report-page-container">
            {/* Header */}
            <div className="report-header">
                <div className="report-title">
                    <FileText size={24} color="#6c757d" />
                    Reportes
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="month"
                        id="filter-periodo-report"
                        value={filterPeriodo}
                        onChange={(e) => setFilterPeriodo(e.target.value)}
                        className="form-control"
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                    <div className="report-actions">
                        <button id="btn-export-excel" className="btn-export excel">
                            <FileSpreadsheet size={18} />
                            Exportar Excel
                        </button>
                        <button id="btn-export-pdf" className="btn-export pdf">
                            <FileText size={18} />
                            Exportar PDF
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 20, textAlign: 'center' }}>Cargando datos...</div>
            ) : (
                <>



                </>
            )}
        </div>
    );
}
