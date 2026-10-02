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
    },

    // 7. Se crea un contratista_user -> credenciales de acceso al correo del nuevo usuario
    async notifyCredencialesNuevoUsuario(usuario, plainPassword) {
        const subject = `[Bienvenido] Credenciales de Acceso - Plataforma OVAL Control`;
        const html = `
            <h3>Bienvenido a la Plataforma OVAL Control</h3>
            <p>Se ha creado una cuenta de acceso a su nombre, <strong>${usuario.name}</strong>, con las siguientes credenciales:</p>
            <p>
                <strong>Usuario (correo):</strong> ${usuario.email}<br>
                <strong>Contraseña temporal:</strong> ${plainPassword}
            </p>
            <p>Le recomendamos cambiar su contraseña después de su primer ingreso.</p>
            <a href="${process.env.FRONTEND_URL}/login">Ir a la Plataforma</a>
        `;
        return this.sendMail({ to: usuario.email, subject, html });
    },

    // 8. Solicitud de recuperación de contraseña -> enlace de un solo uso al correo
    async notifyRecuperacionPassword(usuario, resetUrl) {
        const subject = `[OVAL Control] Recuperación de Contraseña`;
        const html = `
            <h3>Recuperación de Contraseña</h3>
            <p>Hola ${usuario.name},</p>
            <p>Recibimos una solicitud para restablecer la contraseña de su cuenta (<strong>${usuario.email}</strong>).</p>
            <p>Si usted realizó esta solicitud, haga clic en el siguiente enlace para elegir una nueva contraseña. Este enlace es válido por 1 hora y solo puede usarse una vez.</p>
            <a href="${resetUrl}">Restablecer Contraseña</a>
            <p style="font-size: 12px; color: #64748b; margin-top: 20px;">Si usted no solicitó este cambio, puede ignorar este correo — su contraseña actual seguirá funcionando.</p>
        `;
        return this.sendMail({ to: usuario.email, subject, html });
    },

    // 9. Resumen de solicitudes de reapertura pendientes para Administrador de Contrato
    async notifyResumenReaperturasPendientesADC({ adcUser, solicitudes, periodo, mensaje }) {
        const periodoStr = periodo && periodo !== "todos" ? ` - Periodo ${periodo}` : "";
        const subject = `[OVAL Control] Solicitudes de Reapertura Pendientes${periodoStr}`;

        const rowsHtml = solicitudes.map((s, index) => {
            const r = s.registro || {};
            const v = r.vinculacionEntidad || {};
            const gerencia = v.gerencia?.nombre || v.dependencia?.subgerencia?.gerencia?.nombre || "-";
            const subgerencia = v.subgerencia?.nombre || v.dependencia?.subgerencia?.nombre || "-";
            const servicio = v.servicio?.nombre || "-";
            const planta = v.dependencia?.nombre || "-";
            const contratista = r.eecc_nombre || v.contratista?.nombre || "-";
            const fecha = s.created_at ? new Date(s.created_at).toLocaleDateString("es-CL") : "-";
            const solicitante = s.solicitante ? `${s.solicitante.name || ""} (${s.solicitante.email || ""})` : "-";
            const motivo = s.motivo || "-";

            const bg = index % 2 === 0 ? "#ffffff" : "#f8fafc";

            return `
                <tr style="background-color: ${bg}; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 12px; font-weight: bold; color: #1e293b; font-size: 13px;">${r.periodo || "-"}</td>
                    <td style="padding: 10px 12px; color: #334155; font-size: 13px;">${contratista}</td>
                    <td style="padding: 10px 12px; color: #334155; font-size: 13px;">${gerencia}</td>
                    <td style="padding: 10px 12px; color: #334155; font-size: 13px;">${subgerencia}</td>
                    <td style="padding: 10px 12px; color: #334155; font-size: 13px;">${servicio}</td>
                    <td style="padding: 10px 12px; color: #334155; font-size: 13px;">${planta}</td>
                    <td style="padding: 10px 12px; color: #334155; font-size: 13px;">${solicitante}</td>
                    <td style="padding: 10px 12px; color: #64748b; font-size: 12px; white-space: nowrap;">${fecha}</td>
                    <td style="padding: 10px 12px; color: #1e293b; font-size: 13px; max-width: 250px;">${motivo}</td>
                </tr>
            `;
        }).join("");

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; background-color: #f1f5f9; }
                    .card { background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; max-width: 1050px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                    .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #ffffff; padding: 24px; text-align: left; }
                    .content { padding: 24px; }
                    .table-wrapper { width: 100%; overflow-x: auto; margin-top: 16px; margin-bottom: 24px; border: 1px solid #cbd5e1; border-radius: 6px; }
                    table { width: 100%; border-collapse: collapse; text-align: left; }
                    th { background-color: #0f172a; color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 10px 12px; }
                    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; }
                    .footer { padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="header">
                        <h2 style="margin: 0; font-size: 20px; font-weight: 700;">OVAL Control &mdash; Plataforma de Cumplimiento</h2>
                        <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">Resumen de Solicitudes de Reapertura Pendientes</p>
                    </div>
                    <div class="content">
                        <p style="font-size: 15px; margin-top: 0;">Estimado(a) <strong>${adcUser.name}</strong>,</p>
                        <p style="font-size: 14px; line-height: 1.5; color: #334155;">
                            Se informa que actualmente existen <strong>${solicitudes.length}</strong> solicitud(es) de reapertura en estado <strong style="color: #b45309;">PENDIENTE</strong> asociadas a los contratos y vinculaciones bajo su administración${periodoStr}.
                        </p>
                        ${mensaje ? `
                        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
                            <strong style="color: #1e40af; font-size: 13px;">Mensaje de coordinación:</strong>
                            <p style="margin: 4px 0 0 0; font-size: 14px; color: #1e293b;">${mensaje.replace(/\n/g, "<br>")}</p>
                        </div>
                        ` : ""}

                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Periodo</th>
                                        <th>Contratista</th>
                                        <th>Gerencia</th>
                                        <th>Subgerencia</th>
                                        <th>Servicio</th>
                                        <th>Planta</th>
                                        <th>Solicitante</th>
                                        <th>Fecha</th>
                                        <th>Motivo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>

                        <div style="text-align: center; margin: 30px 0 10px 0;">
                            <a href="${frontendUrl}/reaperturas" class="btn">
                                Ingresar a Gestión de Solicitudes
                            </a>
                        </div>
                    </div>
                    <div class="footer">
                        Este es un correo automático enviado desde la plataforma OVAL Control. Por favor no responda directamente a este mensaje.
                    </div>
                </div>
            </body>
            </html>
        `;

        return this.sendMail({ to: adcUser.email, subject, html });
    }
};

emailService.init();

module.exports = emailService;
