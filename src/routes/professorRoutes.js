const express = require('express');
const router = express.Router();
const {cadastrar,cadastrarPeloCoordenador,listar,remover, listarVinculosProfessor, registrarChamada,listarChamadas, obterChamada, editarChamada, listarFrequenciaTurma, criarAvaliacao, listarAvaliacoes,obterAvaliacao, salvarNotasAvaliacao, excluirAvaliacao, obterPerfilProfessor, editarAvaliacao } = require('../controllers/professorController');
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

// PUT /api/professores/chamadas/:id — editar chamada do professor autenticado
router.put('/chamadas/:id',autenticar,somenteProfessor, editarChamada);

router.get("/frequencia",autenticar,somenteProfessor,listarFrequenciaTurma);

// POST /api/professores/avaliacoes — criar avaliação
router.post('/avaliacoes', autenticar, somenteProfessor, criarAvaliacao);

// GET /api/professores/avaliacoes — listar avaliações da turma e disciplina
router.get('/avaliacoes', autenticar, somenteProfessor, listarAvaliacoes);

// GET /api/professores/avaliacoes/:id — consultar avaliação e notas dos alunos
router.get('/avaliacoes/:id', autenticar, somenteProfessor, obterAvaliacao);

// PUT /api/professores/avaliacoes/:id/notas — salvar notas da avaliação
router.put('/avaliacoes/:id/notas', autenticar, somenteProfessor, salvarNotasAvaliacao);

// DELETE /api/professores/avaliacoes/:id — excluir avaliação
router.delete('/avaliacoes/:id', autenticar, somenteProfessor, excluirAvaliacao);

// GET /api/professores/perfil — obter perfil do professor autenticado
router.get('/perfil', autenticar, somenteProfessor, obterPerfilProfessor);

router.put('/avaliacoes/:id', autenticar, somenteProfessor, editarAvaliacao);

module.exports = router;