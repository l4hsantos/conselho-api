const express = require('express');
const router = express.Router();

const {listar,listarDisciplinas,cadastrar,remover,
} = require('../controllers/vinculoController');

const {autenticar,somenteCoordenador,
} = require('../middlewares/auth');

router.get('/',autenticar,somenteCoordenador,listar
);

router.get( '/disciplinas', autenticar, somenteCoordenador, listarDisciplinas
);

router.post('/',autenticar,somenteCoordenador,cadastrar
);

router.delete('/:id',autenticar,somenteCoordenador,remover
);

module.exports = router;