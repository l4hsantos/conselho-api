const express = require('express');
const router = express.Router();

const {
  listar,
  listarDisciplinas,
  cadastrar,
  remover,
  listarTurmasDoProfessor,
} = require('../controllers/vinculoController');

const {
  autenticar,
  somenteCoordenador,
  somenteProfessor,
} = require('../middlewares/auth');

router.get(
  '/',
  autenticar,
  somenteCoordenador,
  listar
);

router.get(
  '/disciplinas',
  autenticar,
  somenteCoordenador,
  listarDisciplinas
);
// listar as turmassss
router.get(
  '/turmas/professor',
  autenticar,
  somenteProfessor,
  listarTurmasDoProfessor
);

router.post(
  '/',
  autenticar,
  somenteCoordenador,
  cadastrar
);

router.delete(
  '/:id',
  autenticar,
  somenteCoordenador,
  remover
);

module.exports = router;