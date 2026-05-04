const nodemailer = require('nodemailer');

const emailService = {
    transporter: null,

    // Initialize transporter
    init() {
        if (process.env.MAIL_HOST) {
            this.transporter = nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: process.env.MAIL_PORT || 587,
                secure: process.env.MAIL_ENCRYPTION === 'ssl',
                auth: {
                    user: process.env.MAIL_USERNAME,
                    pass: process.env.MAIL_PASSWORD,
                },
            });
            console.log('✅ Email Service: SMTP Configured (SendGrid)');
        } else {
            console.log('⚠️ Email Service: Mock Mode (No SMTP Config)');
        }
    },

    async sendMail({ to, subject, html, attachments = [] }) {
        if (this.transporter) {
            try {
                const info = await this.transporter.sendMail({
                    from: `"${process.env.MAIL_FROM_NAME || 'Sistema'}" <${process.env.MAIL_FROM_ADDRESS || 'no-reply@ovalcontrol.com'}>`,
                    to,
                    subject,
                    html,
                    attachments
                });
                console.log(`📧 Email sent to ${to}: ${info.messageId}`);
                return true;
            } catch (error) {
                console.error('❌ Email failed:', error);
                return false;
            }
        } else {
            console.log('--- [MOCK EMAIL] ---');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log('Content (Preview):', html.substring(0, 100) + '...');
            console.log('--------------------');
            return true;
        }
    },

    // 1. Contratista envia un registro para auditar -> Alerta a admin contrato (ADC)
    async notifyRegistroEnviado(registro, adminEmails) {
        const subject = `[AUDITORÍA] Registro Enviado: ${registro.periodo} - ${registro.eecc_nombre}`;
        const html = `
            <h3>Nuevo Registro para Auditoría</h3>
            <p>El contratista <strong>${registro.eecc_nombre}</strong> ha enviado su registro del periodo <strong>${registro.periodo}</strong> para revisión.</p>
            <p>Por favor ingrese a la plataforma para auditar.</p>
            <a href="${process.env.FRONTEND_URL}/registros/${registro.id}/auditar">Ir al Registro</a>
        `;
        return this.sendMail({ to: adminEmails, subject, html });
    },

    // 2. Admin contrato finaliza auditoria de registro -> Alerta a contratista user
    async notifyAuditoriaFinalizada(registro, contractorEmail) {
        const subject = `[AUDITORÍA] Resultados Disponibles: ${registro.periodo}`;
        const html = `
            <h3>Auditoría de Cumplimiento Finalizada</h3>
            <p>Se ha completado la revisión de su registro del periodo <strong>${registro.periodo}</strong>.</p>
            <p><strong>Resultado Final:</strong> ${registro.porcentaje_cumplimiento_auditor}% de cumplimiento.</p>
            <p>Puede revisar los hallazgos y el informe detallado en su historial de registros.</p>
            <a href="${process.env.FRONTEND_URL}/registros/${registro.id}">Ver Resultados</a>
        `;
        return this.sendMail({ to: contractorEmail, subject, html });
    },

    // 3. Contratista solicita reapertura -> Alerta a admin contrato
    async notifyReaperturaSolicitada(registro, solicitante, adminEmails, motivo) {
        const subject = `[REAPERTURA] Solicitud: ${registro.periodo} - ${registro.eecc_nombre}`;
        const html = `
            <h3>Solicitud de Reapertura</h3>
            <p>El usuario <strong>${solicitante.name}</strong> ha solicitado reabrir el registro <strong>${registro.periodo}</strong>.</p>
            <p><strong>Motivo:</strong> ${motivo || 'No especificado'}</p>
            <a href="${process.env.FRONTEND_URL}/reaperturas">Gestionar Solicitudes</a>
        `;
        return this.sendMail({ to: adminEmails, subject, html });
    },

    // 4. Admin contrato acepta o rechaza solicitud de reapertura -> Alerta a contratista user
    async notifyReaperturaResult(solicitud, registro, contractorEmail) {
        const estado = solicitud.estado === 'aprobada' ? 'APROBADA' : 'RECHAZADA';
        const subject = `[REAPERTURA] Solicitud ${estado}: ${registro.periodo}`;
        const html = `
            <h3>Notificación de Solicitud de Reapertura</h3>
            <p>Su solicitud para reabrir el registro <strong>${registro.periodo}</strong> ha sido <strong>${estado}</strong>.</p>
            <p><strong>Comentarios de Administración:</strong> ${solicitud.respuesta || 'Sin comentarios'}</p>
            ${solicitud.estado === 'aprobada' ? `<p>El registro ahora está disponible para edición y subsanación.</p>` : ''}
            <a href="${process.env.FRONTEND_URL}/registros/${registro.id}">Ver Registro</a>
        `;
        return this.sendMail({ to: contractorEmail, subject, html });
    },

    // 5. Contratista user finaliza subsanacion y envia para revision -> Alerta a admin contrato
    async notifySubsanacionEnviada(registro, adminEmails) {
        const subject = `[SUBSANACIÓN] Pendiente de Revisión: ${registro.periodo} - ${registro.eecc_nombre}`;
        const html = `
            <h3>Subsanación Finalizada</h3>
            <p>El contratista <strong>${registro.eecc_nombre}</strong> ha finalizado la carga de evidencias y comentarios para la subsanación del periodo <strong>${registro.periodo}</strong>.</p>
            <p>El registro está listo para su revisión final.</p>
            <a href="${process.env.FRONTEND_URL}/registros/${registro.id}/auditar">Revisar Subsanación</a>
        `;
        return this.sendMail({ to: adminEmails, subject, html });
    },

    // 6. Admin contrato termina revision de subsanacion -> Alerta a contratista user
    async notifyRevisionFinalizada(registro, contractorEmail) {
        const subject = `[AUDITORÍA] Proceso Finalizado: ${registro.periodo}`;
        const html = `
            <h3>Revisión de Subsanación Finalizada</h3>
            <p>El Administrador de Contrato ha finalizado la revisión de su proceso de subsanación para el periodo <strong>${registro.periodo}</strong>.</p>
            <p><strong>Resultado Final:</strong> ${registro.porcentaje_cumplimiento_auditor}%.</p>
            <p>El registro ha sido cerrado y marcado como FINALIZADO.</p>
            <a href="${process.env.FRONTEND_URL}/registros/${registro.id}">Ver Registro</a>
        `;
        return this.sendMail({ to: contractorEmail, subject, html });
    }
};

emailService.init();

module.exports = emailService;
