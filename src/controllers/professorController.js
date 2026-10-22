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

// POST /api/professores  (só coordenador, autenticado)
// Diferente do "cadastrar": aqui não precisa de chave de acesso,
// porque só um coordenador logado pode chamar essa rota.
async function cadastrarPeloCoordenador(req, res) {
  const { nomeCompleto, email, senha } = req.body;

  if (!nomeCompleto || !email || !senha) {
    return res.status(400).json({ erro: 'Preencha todos os campos.' });
  }

  if (!email.toLowerCase().endsWith('@docente.com')) {
    return res.status(400).json({ erro: 'O email de professor deve terminar com "@docente.com".' });
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
      [nomeCompleto.trim(), email.toLowerCase(), senhaHash]
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
async function listarVinculosProfessor(req, res) {
  try {
    const [vinculos] = await pool.query(
      `SELECT
         v.turma_id,
         t.ano,
         t.letra,
         v.disciplina_id,
         d.nome AS disciplina
       FROM vinculos v
       JOIN turmas t ON t.id = v.turma_id
       JOIN disciplinas d ON d.id = v.disciplina_id
       WHERE v.professor_id = ?
       ORDER BY t.ano, t.letra, d.nome`,
      [req.usuario.id]
    );

    return res.json(vinculos);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar vínculos do professor.' });
  }
}

async function registrarChamada(req, res) {
  const { turma_id, disciplina_id, data_aula, alunos } = req.body;

  const turmaId = Number(turma_id);
  const disciplinaId = Number(disciplina_id);

  if (
    !Number.isInteger(turmaId) ||
    turmaId <= 0 ||
    !Number.isInteger(disciplinaId) ||
    disciplinaId <= 0
  ) {
    return res.status(400).json({ erro: 'Turma ou disciplina inválida.' });
  }

  const dataValida =
    typeof data_aula === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(data_aula) &&
    !Number.isNaN(Date.parse(`${data_aula}T00:00:00Z`)) &&
    new Date(`${data_aula}T00:00:00Z`).toISOString().slice(0, 10) === data_aula;

  if (!dataValida) {
    return res.status(400).json({ erro: 'Informe a data no formato AAAA-MM-DD.' });
  }

  if (!Array.isArray(alunos) || alunos.length === 0) {
    return res.status(400).json({ erro: 'A lista de alunos está vazia ou inválida.' });
  }

  const registros = [];
  const idsRecebidos = new Set();

  for (const aluno of alunos) {
    const alunoId = Number(aluno?.aluno_id);
    const presente = aluno?.presente;

    if (
      !Number.isInteger(alunoId) ||
      alunoId <= 0 ||
      idsRecebidos.has(alunoId) ||
      ![true, false, 0, 1].includes(presente)
    ) {
      return res.status(400).json({ erro: 'Há dados inválidos na lista de alunos.' });
    }

    idsRecebidos.add(alunoId);
    registros.push([alunoId, presente === true || presente === 1 ? 1 : 0]);
  }

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    // Confere se o professor autenticado tem este vínculo.
    const [vinculos] = await conexao.execute(
      `SELECT id
       FROM vinculos
       WHERE professor_id = ? AND turma_id = ? AND disciplina_id = ?`,
      [req.usuario.id, turmaId, disciplinaId]
    );

    if (vinculos.length === 0) {
      await conexao.rollback();
      return res.status(403).json({
        erro: 'Você não tem vínculo com esta turma e disciplina.',
      });
    }

    // Confere se a chamada contém exatamente os alunos atualmente matriculados na turma.
    const [alunosDaTurma] = await conexao.execute(
      'SELECT id FROM alunos WHERE turma_id = ? ORDER BY id',
      [turmaId]
    );

    const idsDaTurma = alunosDaTurma.map((aluno) => aluno.id).sort((a, b) => a - b);
    const idsEnviados = [...idsRecebidos].sort((a, b) => a - b);

    if (
      idsDaTurma.length !== idsEnviados.length ||
      idsDaTurma.some((id, indice) => id !== idsEnviados[indice])
    ) {
      await conexao.rollback();
      return res.status(400).json({
        erro: 'A lista enviada não corresponde aos alunos matriculados nesta turma.',
      });
    }

    const [resultado] = await conexao.execute(
      `INSERT INTO chamadas
         (professor_id, turma_id, disciplina_id, data_aula)
       VALUES (?, ?, ?, ?)`,
      [req.usuario.id, turmaId, disciplinaId, data_aula]
    );

    const chamadaId = resultado.insertId;
    const placeholders = registros.map(() => '(?, ?, ?)').join(', ');
    const valores = registros.flatMap(([alunoId, presente]) => [
      chamadaId,
      alunoId,
      presente,
    ]);

    await conexao.execute(
      `INSERT INTO chamada_alunos (chamada_id, aluno_id, presente)
       VALUES ${placeholders}`,
      valores
    );

    await conexao.commit();

    return res.status(201).json({
      mensagem: 'Chamada registrada com sucesso.',
      chamada_id: chamadaId,
    });
  } catch (erro) {
    if (conexao) {
      await conexao.rollback();
    }

    if (erro.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        erro: 'Já existe uma chamada para esta turma, disciplina e data.',
      });
    }

    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao registrar a chamada.' });
  } finally {
    if (conexao) conexao.release();
  }
}
async function listarChamadas(req, res) {
  try {
    const [chamadas] = await pool.query(
      `SELECT
         c.id AS chamada_id,
         c.turma_id,
         t.ano,
         t.letra,
         c.disciplina_id,
         d.nome AS disciplina,
         DATE_FORMAT(c.data_aula, '%Y-%m-%d') AS data_aula,
         COUNT(ca.aluno_id) AS total_alunos,
         COALESCE(SUM(ca.presente = 1), 0) AS presentes,
         COALESCE(SUM(ca.presente = 0), 0) AS faltas
       FROM chamadas c
       JOIN turmas t ON t.id = c.turma_id
       JOIN disciplinas d ON d.id = c.disciplina_id
       LEFT JOIN chamada_alunos ca ON ca.chamada_id = c.id
       WHERE c.professor_id = ?
       GROUP BY
         c.id, c.turma_id, t.ano, t.letra,
         c.disciplina_id, d.nome, c.data_aula
       ORDER BY c.data_aula DESC, c.id DESC`,
      [req.usuario.id]
    );

    return res.json(chamadas);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao consultar as chamadas.' });
  }
}

async function obterChamada(req, res) {
  const chamadaId = Number(req.params.id);

  if (!Number.isInteger(chamadaId) || chamadaId <= 0) {
    return res.status(400).json({ erro: 'Número da chamada inválido.' });
  }

  try {
    const [linhas] = await pool.query(
      `SELECT
         c.id AS chamada_id,
         c.turma_id,
         t.ano,
         t.letra,
         c.disciplina_id,
         d.nome AS disciplina,
         DATE_FORMAT(c.data_aula, '%Y-%m-%d') AS data_aula,
         a.id AS aluno_id,
         a.nome_completo,
         a.matricula,
         ca.presente
       FROM chamadas c
       JOIN turmas t ON t.id = c.turma_id
       JOIN disciplinas d ON d.id = c.disciplina_id
       LEFT JOIN chamada_alunos ca ON ca.chamada_id = c.id
       LEFT JOIN alunos a ON a.id = ca.aluno_id
       WHERE c.id = ? AND c.professor_id = ?
       ORDER BY a.nome_completo`,
      [chamadaId, req.usuario.id]
    );

    if (linhas.length === 0) {
      return res.status(404).json({ erro: 'Chamada não encontrada.' });
    }

    const chamada = {
      chamada_id: linhas[0].chamada_id,
      turma_id: linhas[0].turma_id,
      ano: linhas[0].ano,
      letra: linhas[0].letra,
      disciplina_id: linhas[0].disciplina_id,
      disciplina: linhas[0].disciplina,
      data_aula: linhas[0].data_aula,
    };

    const alunos = linhas
      .filter((linha) => linha.aluno_id !== null)
      .map((linha) => ({
        aluno_id: linha.aluno_id,
        nome_completo: linha.nome_completo,
        matricula: linha.matricula,
        presente: Boolean(linha.presente),
      }));

    return res.json({ chamada, alunos });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao consultar esta chamada.' });
  }
}

module.exports = { cadastrar, cadastrarPeloCoordenador, listar, remover, listarVinculosProfessor,registrarChamada, listarChamadas, obterChamada};