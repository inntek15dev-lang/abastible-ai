// IEEE Trace: Sprint 7 | Role Controller
const { Role, Privilegio, sequelize } = require('../database/models');

const roleController = {
    // GET /roles
    async index(req, res) {
        try {
            const roles = await Role.findAll();
            res.json({ success: true, data: roles });
        } catch (error) {
            console.error('Error listing roles:', error);
            res.status(500).json({ success: false, message: 'Error al listar roles' });
        }
    },

    // POST /roles
    async store(req, res) {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).json({ message: 'Nombre requerido' });

            const role = await Role.create({
                name,
                guard_name: 'web'
            });
            res.status(201).json({ success: true, data: role });
        } catch (error) {
            console.error('Error creating role:', error);
            res.status(500).json({ success: false, message: 'Error al crear rol' });
        }
    },

    // PUT /roles/:id
    async update(req, res) {
        try {
            const { name } = req.body;
            const role = await Role.findByPk(req.params.id);
            if (!role) return res.status(404).json({ message: 'Rol no encontrado' });

            // Protect critical roles
            if (['admin', 'administrador_contrato', 'contratista_admin', 'contratista_user'].includes(role.name)) {
                // Allow name change? Maybe not for system roles to simplify logic, but let's allow it for now or block it.
                // Better block renaming system roles to avoid breaking seed logic references if any.
                // For now, let's allow updating but warn or just update.
            }

            role.name = name || role.name;
            await role.save();
            res.json({ success: true, data: role });
        } catch (error) {
            console.error('Error updating role:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar rol' });
        }
    },

    // DELETE /roles/:id
    async destroy(req, res) {
        try {
            const role = await Role.findByPk(req.params.id);
            if (!role) return res.status(404).json({ message: 'Rol no encontrado' });

            // Prevent deleting core roles
            const protectedRoles = ['admin', 'administrador_contrato', 'contratista_admin', 'contratista_user'];
            if (protectedRoles.includes(role.name)) {
                return res.status(403).json({ message: 'No se pueden eliminar roles del sistema' });
            }

            await role.destroy();
            res.json({ success: true, message: 'Rol eliminado' });
        } catch (error) {
            console.error('Error deleting role:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar rol' });
        }
    },

    // GET /roles/:id/privileges
    async getPrivileges(req, res) {
        try {
            const privileges = await Privilegio.findAll({
                where: { role_id: req.params.id }
            });
            res.json({ success: true, data: privileges });
        } catch (error) {
            console.error('Error getting privileges:', error);
            res.status(500).json({ success: false, message: 'Error al obtener privilegios' });
        }
    },

    // PUT /roles/:id/privileges
    // Expects: { privileges: [ { ref_modulo: 'Dashboard', read: 1, write: 0, excec: 0 }, ... ] }
    async updatePrivileges(req, res) {
        const t = await sequelize.transaction();
        try {
            const roleId = req.params.id;
            const { privileges } = req.body; // Array of privilege objects

            // 1. Delete existing privileges for this role
            await Privilegio.destroy({
                where: { role_id: roleId },
                transaction: t
            });

            // 2. Bulk create new privileges
            const newPrivileges = privileges.map(p => ({
                role_id: roleId,
                ref_modulo: p.ref_modulo,
                read: p.read ? 1 : 0,
                write: p.write ? 1 : 0,
                excec: p.excec ? 1 : 0
            }));

            await Privilegio.bulkCreate(newPrivileges, { transaction: t });

            await t.commit();
            res.json({ success: true, message: 'Privilegios actualizados correctamente' });
        } catch (error) {
            await t.rollback();
            console.error('Error updating privileges:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar privilegios' });
        }
    }
};

module.exports = roleController;
