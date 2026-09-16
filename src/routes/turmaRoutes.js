const express = require('express');
const router = express.Router();
const { listar } = require('../controllers/turmaController');
const { autenticar } = require('../middlewares/auth');

router.get('/', autenticar, listar);

module.exports = router;