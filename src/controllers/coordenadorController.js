require('dotenv').config();

const bcrypt = require('bcryptjs');

const pool = require('../config/db');


// POST /api/coordenadores/cadastro
// Cadastro do próprio coordenador

async function cadastrar(req, res) {
  const { nomeCompleto, email, chaveAcesso, senha } = req.body;

  if (!nomeCompleto || !email || !chaveAcesso || !senha) {
    return res.status(400).json({
      erro: 'Preencha todos os campos.',
    });
  }

  if (!email.toLowerCase().endsWith('@coordenador.com')) {
    return res.status(400).json({
      erro: 'O email de coordenador deve terminar com "@coordenador.com".',
    });
  }

  if (chaveAcesso !== process.env.CHAVE_COORDENADOR) {
    return res.status(403).json({
      erro: 'Chave de acesso inválida.',
    });
  }

  if (senha.length < 6) {
    return res.status(400).json({
      erro: 'A senha deve ter pelo menos 6 caracteres.',
    });
  }

  try {
    const [existentes] = await pool.query(
      'SELECT id FROM coordenadores WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existentes.length > 0) {
      return res.status(409).json({
        erro: 'Já existe um coordenador com esse email.',
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const [resultado] = await pool.query(
      `
      INSERT INTO coordenadores
      (nome_completo, email, senha_hash)
      VALUES (?, ?, ?)
      `,
      [
        nomeCompleto.trim(),
        email.toLowerCase(),
        senhaHash,
      ]
    );

    return res.status(201).json({
      mensagem: 'Coordenador cadastrado com sucesso.',
      id: resultado.insertId,
    });
  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: 'Erro interno ao cadastrar coordenador.',
    });
  }
}


// GET /api/coordenadores
// Lista coordenadores

async function listar(req, res) {
  try {
    const [linhas] = await pool.query(
      `
      SELECT
        id,
        nome_completo,
        email,
        telefone,
        foto_url,
        criado_em
      FROM coordenadores
      `
    );

    return res.json(linhas);
  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: 'Erro interno ao listar coordenadores.',
    });
  }
}


// GET /api/coordenadores/perfil
// Busca o próprio perfil

async function buscarPerfil(req, res) {
  try {
    const [linhas] = await pool.query(
      `
      SELECT
        id,
        nome_completo,
        email,
        telefone,
        foto_url,
        criado_em
      FROM coordenadores
      WHERE id = ?
      `,
      [req.usuario.id]
    );

    if (linhas.length === 0) {
      return res.status(404).json({
        erro: 'Coordenador não encontrado.',
      });
    }

    return res.json(linhas[0]);
  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: 'Erro interno ao buscar perfil.',
    });
  }
}


// PUT /api/coordenadores/perfil
// Atualiza o próprio perfil

async function atualizarPerfil(req, res) {
  const {
    telefone,
    fotoUrl,
  } = req.body;

  try {
    const [resultado] = await pool.query(
      `
      UPDATE coordenadores
      SET
        telefone = ?,
        foto_url = ?
      WHERE id = ?
      `,
      [
        telefone || null,
        fotoUrl || null,
        req.usuario.id,
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        erro: 'Coordenador não encontrado.',
      });
    }

    return res.json({
      mensagem: 'Perfil atualizado com sucesso.',
    });
  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: 'Erro interno ao atualizar perfil.',
    });
  }
}

module.exports = {
  cadastrar,
  listar,
  buscarPerfil,
  atualizarPerfil,
};