const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// POST /api/alunos/pre-cadastro  (protegido — só coordenador)
// O coordenador cria o registro do aluno ANTES dele existir no app.
// O aluno ainda não tem senha — ele define isso na "ativação".
async function preCadastrar(req, res) {
  const { matricula, nomeCompleto, dataNascimento, telefone, endereco, nomeResponsavel } = req.body;

  if (!matricula || !nomeCompleto || !dataNascimento) {
    return res.status(400).json({ erro: 'Matrícula, nome completo e data de nascimento são obrigatórios.' });
  }

  try {
    const [existentes] = await pool.query('SELECT id FROM alunos WHERE matricula = ?', [matricula]);
    if (existentes.length > 0) {
      return res.status(409).json({ erro: 'Já existe um aluno com essa matrícula.' });
    }

    const nomeEmMaiuscula = nomeCompleto.toUpperCase();

    const [resultado] = await pool.query(
      `INSERT INTO alunos
        (matricula, nome_completo, data_nascimento, telefone, endereco, nome_responsavel, cadastrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        matricula,
        nomeEmMaiuscula,
        dataNascimento, // esperado: "AAAA-MM-DD"
        telefone || null,
        endereco || null,
        nomeResponsavel || null,
        req.usuario.id, // vem do token do coordenador logado
      ]
    );

    return res.status(201).json({
      mensagem: 'Aluno pré-cadastrado com sucesso. Ele já pode ativar o acesso dele no app.',
      id: resultado.insertId,
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao pré-cadastrar aluno.' });
  }
}

// POST /api/alunos/ativar
// O ALUNO usa essa rota (sem precisar estar logado ainda).
// Ele confirma matrícula + data de nascimento e define a própria senha.
async function ativar(req, res) {
  const { matricula, dataNascimento, senha } = req.body;

  if (!matricula || !dataNascimento || !senha) {
    return res.status(400).json({ erro: 'Preencha todos os campos.' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const [linhas] = await pool.query('SELECT * FROM alunos WHERE matricula = ?', [matricula]);
    const aluno = linhas[0];

    if (!aluno) {
      return res.status(404).json({ erro: 'Matrícula não encontrada. Fale com a coordenação.' });
    }

    if (aluno.ativado) {
      return res.status(409).json({ erro: 'Este cadastro já foi ativado. Faça login normalmente.' });
    }

    // Compara a data enviada (AAAA-MM-DD) com a que está no banco
    const dataBanco = new Date(aluno.data_nascimento).toISOString().slice(0, 10);
    if (dataBanco !== dataNascimento) {
      return res.status(401).json({ erro: 'Data de nascimento não confere com o cadastro.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    await pool.query(
      'UPDATE alunos SET senha_hash = ?, ativado = 1 WHERE id = ?',
      [senhaHash, aluno.id]
    );

    return res.json({ mensagem: 'Cadastro ativado com sucesso. Agora você já pode fazer login.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao ativar cadastro.' });
  }
}

// GET /api/alunos  (protegido — só coordenador)
async function listar(req, res) {
  try {
    const [linhas] = await pool.query(
      `SELECT id, matricula, nome_completo, data_nascimento, ativado,
              telefone, endereco, nome_responsavel, criado_em
       FROM alunos`
    );
    return res.json(linhas);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao listar alunos.' });
  }
}

// GET /api/alunos/:id  (protegido — coordenador ou o próprio aluno)
async function buscarPorId(req, res) {
  try {
    const [linhas] = await pool.query(
      `SELECT id, matricula, nome_completo, data_nascimento, ativado,
              telefone, endereco, nome_responsavel, criado_em
       FROM alunos WHERE id = ?`,
      [req.params.id]
    );
    if (linhas.length === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado.' });
    }
    return res.json(linhas[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao buscar aluno.' });
  }
}

// PUT /api/alunos/:id  (protegido — só coordenador)
async function atualizar(req, res) {
  const { nomeCompleto, dataNascimento, telefone, endereco, nomeResponsavel } = req.body;

  try {
    const [resultado] = await pool.query(
      `UPDATE alunos SET
        nome_completo = COALESCE(?, nome_completo),
        data_nascimento = COALESCE(?, data_nascimento),
        telefone = COALESCE(?, telefone),
        endereco = COALESCE(?, endereco),
        nome_responsavel = COALESCE(?, nome_responsavel)
       WHERE id = ?`,
      [
        nomeCompleto ? nomeCompleto.toUpperCase() : null,
        dataNascimento || null,
        telefone || null,
        endereco || null,
        nomeResponsavel || null,
        req.params.id,
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado.' });
    }
    return res.json({ mensagem: 'Aluno atualizado com sucesso.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao atualizar aluno.' });
  }
}

// DELETE /api/alunos/:id  (protegido — só coordenador)
async function remover(req, res) {
  try {
    const [resultado] = await pool.query('DELETE FROM alunos WHERE id = ?', [req.params.id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado.' });
    }
    return res.json({ mensagem: 'Aluno removido com sucesso.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao remover aluno.' });
  }
}

module.exports = { preCadastrar, ativar, listar, buscarPorId, atualizar, remover };