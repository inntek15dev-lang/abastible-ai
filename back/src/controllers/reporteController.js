const PDFDocument = require('pdfkit');
const { Registro, RegistroActividad, Actividad, Hallazgo, User, Compromiso, Elemento, sequelize } = require('../database/models');

module.exports = {
    async registroPdf(req, res) {
        try {
            const { id } = req.params;
            const registro = await Registro.findByPk(id, {
                include: [
                    { model: User, as: 'usuario', attributes: ['name', 'email', 'eecc_nombre'] },
                    {
                        model: RegistroActividad,
                        as: 'actividades',
                        include: [
                            { model: Actividad, as: 'actividad' },
                            { model: Hallazgo, as: 'hallazgos', include: ['compromisos'] }
                        ]
                    },
                    { model: User, as: 'auditor', attributes: ['name'] }
                ]
            });

            if (!registro) {
                return res.status(404).json({ message: 'Registro no encontrado' });
            }

            // Create PDF
            const doc = new PDFDocument({ margin: 50 });

            // Pipe to response
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=registro-${registro.periodo}-${registro.id}.pdf`);
            doc.pipe(res);

            // -- HEADER --
            doc.fontSize(20).text('Informe de Cumplimiento OIEM', { align: 'center' });
            doc.moveDown();

            doc.fontSize(12).text(`Periodo: ${registro.periodo}`);
            doc.text(`Empresa: ${registro.eecc_nombre || registro.usuario.eecc_nombre}`);
            doc.text(`Responsable: ${registro.usuario.name}`);
            doc.text(`Fecha Generación: ${new Date().toLocaleDateString()}`);
            doc.moveDown();

            // -- SUMMARY --
            doc.fontSize(16).text('Resumen Ejecutivo', { underline: true });
            doc.fontSize(12).text(`Cumplimiento Total: ${registro.porcentaje_cumplimiento}%`);
            doc.text(`Auditoría: ${registro.porcentaje_cumplimiento_auditor ? registro.porcentaje_cumplimiento_auditor + '%' : 'Pendiente'}`);
            doc.text(`Estado: ${registro.estado_auditoria.toUpperCase()}`);
            if (registro.auditor) {
                doc.text(`Auditor: ${registro.auditor.name}`);
            }
            doc.moveDown();

            // -- FINDINGS --
            const hallazgos = [];
            registro.actividades.forEach(ra => {
                if (ra.hallazgos && ra.hallazgos.length > 0) {
                    hallazgos.push(...ra.hallazgos.map(h => ({ ...h.toJSON(), actividad: ra.actividad.codigo })));
                }
            });

            if (hallazgos.length > 0) {
                doc.fontSize(16).text('Hallazgos Identificados', { underline: true });
                doc.moveDown(0.5);

                hallazgos.forEach((h, i) => {
                    doc.fontSize(12).font('Helvetica-Bold').text(`${i + 1}. [${h.actividad}] ${h.tipo.toUpperCase()}`);
                    doc.font('Helvetica').text(`   Detalle: ${h.descripcion}`);
                    doc.text(`   Estado: ${h.estado}`);
                    if (h.compromisos && h.compromisos.length > 0) {
                        doc.text(`   Compromiso: ${h.compromisos[0].descripcion_compromiso} (${h.compromisos[0].fecha_cumplimiento})`, { color: 'blue' });
                        doc.fillColor('black'); // Reset color
                    }
                    doc.moveDown(0.5);
                });
                doc.moveDown();
            } else {
                doc.fontSize(12).text('No se registraron hallazgos en este periodo.');
                doc.moveDown();
            }

            // -- ACTIVITIES TABLE (Simplified) --
            doc.fontSize(16).text('Detalle de Actividades', { underline: true });
            doc.moveDown(0.5);

            registro.actividades.forEach(ra => {
                const status = ra.cumple ? 'CUMPLE' : 'NO CUMPLE';
                const auditStatus = ra.cumple_auditor === 1 ? 'OK' : (ra.cumple_auditor === 0 ? 'RECHAZADO' : '-');
                const color = ra.cumple ? 'green' : 'red';

                doc.fontSize(10).text(`${ra.actividad.codigo}: ${ra.actividad.descripcion.substring(0, 80)}...`);
                doc.fillColor(color).text(`   Reportado: ${status} | Auditoría: ${auditStatus}`);
                doc.fillColor('black');
                doc.moveDown(0.2);
            });

            // Footer
            doc.end();

        } catch (error) {
            console.error('PDF Error:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error generando PDF' });
            }
        }
    },

    async cumplimientoGeneral(req, res) {
        try {
            const { periodo } = req.query; // Format YYYY-MM
            const user = req.user;
            const whereRegistro = {};

            // Filter logic (Share with DashboardController)
            if (['contratista_admin', 'contratista_user'].includes(user.role)) {
                if (user.eecc_nombre) {
                    whereRegistro.eecc_nombre = user.eecc_nombre;
                }
            } else if (user.role === 'administrador_contrato') {
                // Find assignments
                // For simplicity in this quick impl, assuming we filter by what they can see
                // Ideally reuse logic or middleware
            }

            if (periodo) {
                // Filter by month
                // Sequelize where date starts with YYYY-MM
                // whereRegistro.periodo = { [Op.startsWith]: periodo }; // Might verify date format
                // Better:
                const startDate = new Date(periodo + '-01');
                const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));
                whereRegistro.periodo = {
                    [require('sequelize').Op.gte]: startDate,
                    [require('sequelize').Op.lt]: endDate
                };
            }

            // 1. Resumen de Registros
            const registros = await Registro.findAll({
                where: whereRegistro,
                attributes: ['id', 'periodo', 'eecc_nombre', 'porcentaje_cumplimiento', 'estado_auditoria', 'auditado'],
                order: [['periodo', 'DESC']],
                include: [{ model: User, as: 'usuario', attributes: ['name'] }]
            });

            // 2. Cumplimiento por Elemento
            // This is heavier. We need to aggregate RegistroActividad linked to these registros.
            // If no registros, elements are 0% or N/A?
            // Let's get all elements matches?
            // Complex query:
            // Select Elemento.nombre, AVG(case when respuesta='cumple' then 1 else 0 end)
            // From RegistroActividad
            // Join Actividad -> Elemento
            // Where registro_id IN (registros.ids)

            let elementosStats = [];
            const registroIds = registros.map(r => r.id);

            if (registroIds.length > 0) {
                // Raw query for aggregation
                /*
                SELECT e.id, e.nombre,
                       COUNT(ra.id) as total_actividades,
                       SUM(CASE WHEN ra.respuesta_auditor = 'cumple' OR (ra.respuesta_auditor IS NULL AND ra.respuesta_contratista = 'cumple') THEN 1 ELSE 0 END) as cumplidas
                FROM registro_actividades ra
                JOIN actividades a ON ra.actividad_id = a.id
                JOIN elementos e ON a.elemento_id = e.id
                WHERE ra.registro_id IN (...)
                GROUP BY e.id
                */
                // Using Sequelize syntax:
                // Using Sequelize syntax:
                elementosStats = await RegistroActividad.findAll({
                    attributes: [
                        [sequelize.col('actividad.elemento.id'), 'elemento_id'],
                        [sequelize.col('actividad.elemento.nombre'), 'elemento_nombre'],
                        // Denominator: count only those not NA (2)
                        [sequelize.literal(`SUM(CASE WHEN cumple_auditor != 2 THEN 1 ELSE 0 END)`), 'total_valido'],
                        // Numerator: count those that are 1 (audited) or 1 (contractor if not audited)
                        [sequelize.literal(`SUM(CASE WHEN cumple_auditor = 1 OR (cumple_auditor IS NULL AND cumple = 1) THEN 1 ELSE 0 END)`), 'cumplidas_count']
                    ],
                    include: [{
                        model: Actividad,
                        as: 'actividad',
                        attributes: [],
                        include: [{
                            model: Elemento,
                            as: 'elemento',
                            attributes: ['id', 'nombre']
                        }]
                    }],
                    where: { registro_id: registroIds },
                    group: ['actividad.elemento.id', 'actividad.elemento.nombre'],
                    raw: true
                });

                // Format
                elementosStats = elementosStats.map(e => ({
                    id: e.elemento_id,
                    name: e.elemento_nombre,
                    value: parseInt(e.total_valido) > 0 ? Math.round((parseInt(e.cumplidas_count) / parseInt(e.total_valido)) * 100) : 0
                }));
            }

            // Fill with all elements if needed (optional, for now show only what has data)
            // If we want to show ALL elements even with 0 data, we'd query Elemento.findAll and merge.
            // Let's stick to showing data for now.

            res.json({
                success: true,
                data: {
                    elementos: elementosStats,
                    registros: registros.map(r => ({
                        id: r.id,
                        periodo: r.periodo,
                        eecc: r.eecc_nombre || 'N/A',
                        cumplimiento: parseFloat(r.porcentaje_cumplimiento),
                        estado: parseFloat(r.porcentaje_cumplimiento) >= 85 ? 'Cumple meta' : 'Bajo meta',
                        statusClass: parseFloat(r.porcentaje_cumplimiento) >= 85 ? 'ok' : 'bad'
                    }))
                }
            });

        } catch (error) {
            console.error('Reporte Cumplimiento Error:', error);
            res.status(500).json({ message: 'Error al obtener reporte' });
        }
    }
};
