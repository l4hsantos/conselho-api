require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// POST /api/professores/cadastro
// Cadastro do próprio professor (auto-registro com chave de acesso)
async function cadastrar(req, res) {
  const { nomeCompleto, email, chaveAcesso, senha } = req.body;

  if (!nomeCompleto || !email || !chaveAcesso || !senha) {
    return res.status(400).json({ erro: 'Preencha todos os campos.' });
  }

  if (!email.toLowerCase().endsWith('@docente.com')) {
    return res.status(400).json({ erro: 'O email de professor deve terminar com "@docente.com".' });
  }

  if (chaveAcesso !== process.env.CHAVE_PROFESSOR) {
    return res.status(403).json({ erro: 'Chave de acesso inválida.' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const [existentes] = await pool.query(
      'SELECT id FROM professores WHERE email = ?',
      [email.toLowerCase()]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ erro: 'Já existe um professor com esse email.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const [resultado] = await pool.query(
      'INSERT INTO professores (nome_completo, email, senha_hash) VALUES (?, ?, ?)',
      [nomeCompleto, email.toLowerCase(), senhaHash]
    );

    return res.status(201).json({
      mensagem: 'Professor cadastrado com sucesso.',
      id: resultado.insertId,
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao cadastrar professor.' });
  }
}

// GET /api/professores  (só coordenador)
async function listar(req, res) {
  try {
    const [linhas] = await pool.query(
      'SELECT id, nome_completo, email, criado_em FROM professores'
    );
    return res.json(linhas);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao listar professores.' });
  }
}

// DELETE /api/professores/:id  (só coordenador)
async function remover(req, res) {
  try {
    const [resultado] = await pool.query('DELETE FROM professores WHERE id = ?', [req.params.id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Professor não encontrado.' });
    }
    return res.json({ mensagem: 'Professor removido com sucesso.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao remover professor.' });
  }
}

module.exports = { cadastrar, listar, remover };