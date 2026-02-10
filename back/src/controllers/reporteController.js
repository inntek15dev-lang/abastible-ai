const PDFDocument = require('pdfkit');
const { Registro, RegistroActividad, Actividad, Hallazgo, User, Compromiso } = require('../database/models');

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
        res.status(501).json({ message: 'Not implemented yet' });
    }
};
