const express = require("express");
const router = express.Router();

const {
  preCadastrar,
  ativar,
  listar,
  listarPorTurma,
  buscarPorId,
  atualizar,
  remover,
} = require("../controllers/alunoController");

const {
  autenticar,
  somenteCoordenador,
  somenteProfessor,
} = require("../middlewares/auth");

// POST /api/alunos/pre-cadastro
router.post("/pre-cadastro", autenticar, somenteCoordenador, preCadastrar);

// POST /api/alunos/ativar
router.post("/ativar", ativar);

// GET /api/alunos
router.get("/", autenticar, somenteCoordenador, listar);

// GET /api/alunos/turma/:turmaId
// super importante!!
router.get("/turma/:turmaId", autenticar, somenteProfessor, listarPorTurma);

// GET /api/alunos/:id
router.get("/:id", autenticar, buscarPorId);

// PUT /api/alunos/:id
router.put("/:id", autenticar, somenteCoordenador, atualizar);

// DELETE /api/alunos/:id
router.delete("/:id", autenticar, somenteCoordenador, remover);

module.exports = router;
