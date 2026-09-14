const express = require('express');
const router = express.Router();
const { cadastrar, listar, remover } = require('../controllers/professorController');
const { autenticar, somenteCoordenador } = require('../middlewares/auth');

// POST /api/professores/cadastro  → aberto (é o auto-registro com chave)
router.post('/cadastro', cadastrar);

// GET /api/professores  → protegido, só coordenador logado
router.get('/', autenticar, somenteCoordenador, listar);

// DELETE /api/professores/:id  → protegido, só coordenador logado
router.delete('/:id', autenticar, somenteCoordenador, remover);

module.exports = router;