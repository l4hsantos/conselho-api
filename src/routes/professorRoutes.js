const express = require('express');
const router = express.Router();
const {cadastrar,cadastrarPeloCoordenador,listar,remover,} = require('../controllers/professorController');
const { autenticar, somenteCoordenador } = require('../middlewares/auth');

// POST /api/professores/cadastro  → aberto (auto-registro com chave)
router.post('/cadastro', cadastrar);

// POST /api/professores  → só coordenador logado
router.post('/', autenticar, somenteCoordenador, cadastrarPeloCoordenador);

// GET /api/professores  → só coordenador logado
router.get('/', autenticar, somenteCoordenador, listar);

// DELETE /api/professores/:id  → só coordenador logado
router.delete('/:id', autenticar, somenteCoordenador, remover);

module.exports = router;