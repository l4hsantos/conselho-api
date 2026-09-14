const express = require('express');
const router = express.Router();
const {
  preCadastrar,
  ativar,
  listar,
  buscarPorId,
  atualizar,
  remover,
} = require('../controllers/alunoController');
const { autenticar, somenteCoordenador } = require('../middlewares/auth');

// POST /api/alunos/pre-cadastro  → protegido, só coordenador logado
router.post('/pre-cadastro', autenticar, somenteCoordenador, preCadastrar);

// POST /api/alunos/ativar  → aberto (o aluno ainda não tem login pra logar)
router.post('/ativar', ativar);

// GET /api/alunos  → protegido, só coordenador logado
router.get('/', autenticar, somenteCoordenador, listar);

// GET /api/alunos/:id  → protegido (qualquer perfil logado, ex: o próprio aluno)
router.get('/:id', autenticar, buscarPorId);

// PUT /api/alunos/:id  → protegido, só coordenador logado
router.put('/:id', autenticar, somenteCoordenador, atualizar);

// DELETE /api/alunos/:id  → protegido, só coordenador logado
router.delete('/:id', autenticar, somenteCoordenador, remover);

module.exports = router;