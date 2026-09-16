const pool = require('../config/db');

//(1ºA, 1ºB, 2ºA, 2ºB, 3ºA, 3ºB)
async function listar(req, res) {
  try {
    const [linhas] = await pool.query(
      'SELECT id, ano, letra FROM turmas ORDER BY ano, letra'
    );
    return res.json(linhas);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao listar turmas.' });
  }
}

module.exports = { listar };