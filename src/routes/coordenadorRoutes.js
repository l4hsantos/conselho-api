const express = require('express');
const router = express.Router();
const { cadastrar, listar } = require('../controllers/coordenadorController');
const { autenticar, somenteCoordenador } = require('../middlewares/auth');

// POST /api/coordenadores/cadastro  → aberto (é o auto-registro com chave)
router.post('/cadastro', cadastrar);

// GET /api/coordenadores  → protegido, só coordenador logado
router.get('/', autenticar, somenteCoordenador, listar);

module.exports = router;