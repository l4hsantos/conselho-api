const express = require('express');
const router = express.Router();
const {cadastrar,cadastrarPeloCoordenador,listar,remover, listarVinculosProfessor, registrarChamada,listarChamadas, obterChamada} = require('../controllers/professorController');
const { autenticar, somenteCoordenador, somenteProfessor } = require('../middlewares/auth');

// POST /api/professores/cadastro  → aberto (auto-registro com chave)
router.post('/cadastro', cadastrar);

// POST /api/professores  → só coordenador logado
router.post('/', autenticar, somenteCoordenador, cadastrarPeloCoordenador);

// GET /api/professores  → só coordenador logado
router.get('/', autenticar, somenteCoordenador, listar);

// DELETE /api/professores/:id  → só coordenador logado
router.delete('/:id', autenticar, somenteCoordenador, remover);

// GET /api/professores/minhas-vinculos — vínculos do professor autenticado
router.get('/minhas-vinculos',autenticar,somenteProfessor,listarVinculosProfessor);

// POST /api/professores/chamadas — registrar chamada
router.post('/chamadas',autenticar,somenteProfessor,registrarChamada);

// GET /api/professores/chamadas — histórico do professor
router.get('/chamadas', autenticar, somenteProfessor, listarChamadas);

// GET /api/professores/chamadas/:id — alunos e presenças de uma chamada
router.get('/chamadas/:id', autenticar, somenteProfessor, obterChamada);

module.exports = router;