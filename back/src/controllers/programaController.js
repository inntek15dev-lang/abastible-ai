// IEEE Trace: REQ-001 | US-001 | programaController.js
const { Programa, Elemento, Actividad } = require('../database/models');

const programaController = {
    // GET /api/programas
    async index(req, res) {
        try {
            const programas = await Programa.findAll({
                include: [{
                    model: Elemento,
                    as: 'elementos',
                    include: [{
                        model: Actividad,
                        as: 'actividades'
                    }]
                }],
                order: [['id', 'ASC'], ['elementos', 'orden', 'ASC']]
            });

            res.json({
                success: true,
                data: programas
            });
        } catch (error) {
            console.error('Programas index error:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener programas'
            });
        }
    },

    // GET /api/programas/:id
    async show(req, res) {
        try {
            const programa = await Programa.findByPk(req.params.id, {
                include: [{
                    model: Elemento,
                    as: 'elementos',
                    include: [{
                        model: Actividad,
                        as: 'actividades'
                    }]
                }]
            });

            if (!programa) {
                return res.status(404).json({
                    success: false,
                    message: 'Programa no encontrado'
                });
            }

            res.json({
                success: true,
                data: programa
            });
        } catch (error) {
            console.error('Programa show error:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener programa'
            });
        }
    },

    // POST /api/programas
    async store(req, res) {
        try {
            const { nombre, descripcion, activo = 1 } = req.body;

            if (!nombre) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre es requerido'
                });
            }

            const programa = await Programa.create({
                nombre,
                descripcion,
                activo
            });

            res.status(201).json({
                success: true,
                data: programa,
                message: 'Programa creado exitosamente'
            });
        } catch (error) {
            console.error('Programa store error:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear programa'
            });
        }
    },

    // PUT /api/programas/:id
    async update(req, res) {
        try {
            const programa = await Programa.findByPk(req.params.id);

            if (!programa) {
                return res.status(404).json({
                    success: false,
                    message: 'Programa no encontrado'
                });
            }

            const { nombre, descripcion, activo } = req.body;

            await programa.update({
                nombre: nombre ?? programa.nombre,
                descripcion: descripcion ?? programa.descripcion,
                activo: activo ?? programa.activo
            });

            res.json({
                success: true,
                data: programa,
                message: 'Programa actualizado exitosamente'
            });
        } catch (error) {
            console.error('Programa update error:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar programa'
            });
        }
    },

    // DELETE /api/programas/:id
    async destroy(req, res) {
        try {
            const programa = await Programa.findByPk(req.params.id);

            if (!programa) {
                return res.status(404).json({
                    success: false,
                    message: 'Programa no encontrado'
                });
            }

            await programa.destroy();

            res.json({
                success: true,
                message: 'Programa eliminado exitosamente'
            });
        } catch (error) {
            console.error('Programa destroy error:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar programa'
            });
        }
    }
};

module.exports = programaController;
