// IEEE Trace: REQ-012 | US-10.1 | services/emailService.js
const nodemailer = require('nodemailer');

const emailService = {
    transporter: null,

    // Initialize transporter (Mock or Real)
    init() {
        if (process.env.SMTP_HOST) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            console.log('✅ Email Service: SMTP Configured');
        } else {
            console.log('⚠️ Email Service: Mock Mode (No SMTP Config)');
        }
    },

    async sendMail({ to, subject, html }) {
        if (this.transporter) {
            try {
                const info = await this.transporter.sendMail({
                    from: '"Sistema OIEM" <no-reply@abastible.cl>',
                    to,
                    subject,
                    html,
                });
                console.log(`📧 Email sent: ${info.messageId}`);
                return true;
            } catch (error) {
                console.error('❌ Email failed:', error);
                return false;
            }
        } else {
            // Mock Mode
            console.log('--- [MOCK EMAIL] ---');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log('Content (Preview):', html.substring(0, 100) + '...');
            console.log('--------------------');
            return true;
        }
    },

    // Templates
    async notifyRegistroEnviado(registro, auditorEmail) {
        const subject = `Nuevo Registro Enviado: ${registro.periodo} - ${registro.eecc_nombre}`;
        const html = `
            <h3>Nuevo Registro para Auditoría</h3>
            <p>El contratista <strong>${registro.eecc_nombre}</strong> ha enviado su registro del periodo <strong>${registro.periodo}</strong>.</p>
            <p>Por favor ingrese a la plataforma para auditar.</p>
            <a href="${process.env.FRONTEND_URL}/registros/${registro.id}/auditar">Ir al Registro</a>
        `;
        return this.sendMail({ to: auditorEmail, subject, html });
    },

    async notifyReaperturaSolicitada(registro, solicitante, adminEmail) {
        const subject = `Solicitud de Reapertura: ${registro.periodo} - ${registro.eecc_nombre}`;
        const html = `
            <h3>Solicitud de Reapertura</h3>
            <p>El usuario <strong>${solicitante.name}</strong> ha solicitado reabrir el registro <strong>${registro.periodo}</strong>.</p>
            <p><strong>Motivo:</strong> ${registro.motivo || 'No especificado'}</p>
            <a href="${process.env.FRONTEND_URL}/reaperturas">Gestionar Solicitudes</a>
        `;
        return this.sendMail({ to: adminEmail, subject, html });
    },

    async notifyReaperturaResult(solicitud, registro, contratistaEmail) {
        const estado = solicitud.estado === 'aprobada' ? 'APROBADA' : 'RECHAZADA';
        const subject = `Resultado de Solicitud de Reapertura: ${estado}`;
        const html = `
            <h3>Notificación de Reapertura</h3>
            <p>Su solicitud para reabrir el registro <strong>${registro.periodo}</strong> ha sido <strong>${estado}</strong>.</p>
            <p><strong>Comentarios de Administración:</strong> ${solicitud.respuesta || 'Sin comentarios'}</p>
            ${solicitud.estado === 'aprobada' ? `<p><strong>Fecha Límite de Subsanación:</strong> ${registro.fecha_limite_subsanacion || 'No definida'}</p>` : ''}
            <p>Por favor ingrese a la plataforma para coordinar los ajustes pendientes.</p>
            <a href="${process.env.FRONTEND_URL}/registros/${registro.id}/auditar">Ver Registro</a>
        `;
        return this.sendMail({ to: contratistaEmail, subject, html });
    },

    async notifyAuditoriaFinalizada(registro, contratistaEmail) {
        const subject = `Auditoría Finalizada: ${registro.periodo}`;
        const html = `
            <h3>Auditoría de Cumplimiento Finalizada</h3>
            <p>Se ha completado la revisión de su registro del periodo <strong>${registro.periodo}</strong>.</p>
            <p><strong>Resultado Final:</strong> ${registro.porcentaje_cumplimiento}% de cumplimiento.</p>
            <p>Puede revisar los hallazgos y el informe detallado en su historial de registros.</p>
            <a href="${process.env.FRONTEND_URL}/registros/${registro.id}/auditar">Ver Resultados</a>
        `;
        return this.sendMail({ to: contratistaEmail, subject, html });
    }
};

// Auto-init on require (or could be explicit in server.js)
emailService.init();

module.exports = emailService;
