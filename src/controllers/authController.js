require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const TABELAS_POR_PERFIL = {
  aluno: { tabela: 'alunos', colunaLogin: 'matricula' },
  professor: { tabela: 'professores', colunaLogin: 'email' },
  coordenador: { tabela: 'coordenadores', colunaLogin: 'email' },
};

// POST /api/auth/login
// Corpo esperado: { perfil, identificador, senha }
// perfil: "aluno" | "professor" | "coordenador"
// identificador: matrícula (aluno) ou email (professor/coordenador)
async function login(req, res) {
  const { perfil, identificador, senha } = req.body;

  const config = TABELAS_POR_PERFIL[perfil];
  if (!config) {
    return res.status(400).json({ erro: 'Perfil inválido. Use aluno, professor ou coordenador.' });
  }

  if (!identificador || !senha) {
    return res.status(400).json({ erro: 'Preencha usuário e senha.' });
  }

  try {
    const valorBusca = perfil === 'aluno' ? identificador : identificador.toLowerCase();

    const [linhas] = await pool.query(
      `SELECT * FROM ${config.tabela} WHERE ${config.colunaLogin} = ?`,
      [valorBusca]
    );
    const usuario = linhas[0];

    if (!usuario) {
      return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    }

    if (perfil === 'aluno' && !usuario.ativado) {
      return res.status(403).json({ erro: 'Cadastro ainda não ativado. Vá em "Cadastre-se" primeiro.' });
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaConfere) {
      return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    }

    const token = jwt.sign(
      { id: usuario.id, perfil },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Nunca devolver a senha_hash pro app
    delete usuario.senha_hash;

    return res.json({ token, perfil, usuario });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao fazer login.' });
  }
}

module.exports = { login };