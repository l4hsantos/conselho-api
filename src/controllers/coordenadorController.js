require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// POST /api/coordenadores/cadastro
// Cadastro do próprio coordenador (auto-registro com chave de acesso)
async function cadastrar(req, res) {
  const { nomeCompleto, email, chaveAcesso, senha } = req.body;

  if (!nomeCompleto || !email || !chaveAcesso || !senha) {
    return res.status(400).json({ erro: 'Preencha todos os campos.' });
  }

  if (!email.toLowerCase().endsWith('@coordenador.com')) {
    return res.status(400).json({ erro: 'O email de coordenador deve terminar com "@coordenador.com".' });
  }

  if (chaveAcesso !== process.env.CHAVE_COORDENADOR) {
    return res.status(403).json({ erro: 'Chave de acesso inválida.' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const [existentes] = await pool.query(
      'SELECT id FROM coordenadores WHERE email = ?',
      [email.toLowerCase()]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ erro: 'Já existe um coordenador com esse email.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const [resultado] = await pool.query(
      'INSERT INTO coordenadores (nome_completo, email, senha_hash) VALUES (?, ?, ?)',
      [nomeCompleto, email.toLowerCase(), senhaHash]
    );

    return res.status(201).json({
      mensagem: 'Coordenador cadastrado com sucesso.',
      id: resultado.insertId,
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao cadastrar coordenador.' });
  }
}

// GET /api/coordenadores  (protegido — só coordenador)
async function listar(req, res) {
  try {
    const [linhas] = await pool.query(
      'SELECT id, nome_completo, email, criado_em FROM coordenadores'
    );
    return res.json(linhas);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao listar coordenadores.' });
  }
}

module.exports = { cadastrar, listar };