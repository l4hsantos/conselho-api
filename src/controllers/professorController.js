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

// PUT /api/professores/chamadas/:id
async function editarChamada(req, res) {
  const chamadaId = Number(req.params.id);
  const { data_aula, alunos } = req.body;

  if (!Number.isInteger(chamadaId) || chamadaId <= 0) {
    return res.status(400).json({ erro: 'Número da chamada inválido.' });
  }

  const dataValida =
    typeof data_aula === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(data_aula) &&
    !Number.isNaN(Date.parse(`${data_aula}T00:00:00Z`)) &&
    new Date(`${data_aula}T00:00:00Z`).toISOString().slice(0, 10) === data_aula;

  if (!dataValida) {
    return res.status(400).json({
      erro: 'Informe uma data válida no formato AAAA-MM-DD.',
    });
  }

  if (!Array.isArray(alunos) || alunos.length === 0) {
    return res.status(400).json({ erro: 'A lista de alunos é inválida.' });
  }

  const idsRecebidos = [];
  const idsUnicos = new Set();

  for (const aluno of alunos) {
    const alunoId = Number(aluno?.aluno_id);

    if (
      !Number.isInteger(alunoId) ||
      alunoId <= 0 ||
      idsUnicos.has(alunoId) ||
      ![true, false, 0, 1].includes(aluno?.presente)
    ) {
      return res.status(400).json({
        erro: 'Confira os alunos e as presenças informadas.',
      });
    }

    idsUnicos.add(alunoId);
    idsRecebidos.push(alunoId);
  }

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    // Garante que a chamada existe e pertence ao professor autenticado.
    const [chamadasEncontradas] = await conexao.execute(
      `SELECT id
       FROM chamadas
       WHERE id = ? AND professor_id = ?
       FOR UPDATE`,
      [chamadaId, req.usuario.id]
    );

    if (chamadasEncontradas.length === 0) {
      await conexao.rollback();
      return res.status(404).json({ erro: 'Chamada não encontrada.' });
    }

    // A edição não pode incluir nem remover alunos da chamada original.
    const [alunosOriginais] = await conexao.execute(
      `SELECT aluno_id
       FROM chamada_alunos
       WHERE chamada_id = ?`,
      [chamadaId]
    );

    const idsOriginais = alunosOriginais
      .map((aluno) => Number(aluno.aluno_id))
      .sort((a, b) => a - b);

    const idsNovos = [...idsRecebidos].sort((a, b) => a - b);

    const mesmosAlunos =
      idsOriginais.length === idsNovos.length &&
      idsOriginais.every((id, indice) => id === idsNovos[indice]);

    if (!mesmosAlunos) {
      await conexao.rollback();
      return res.status(400).json({
        erro: 'A edição deve manter os mesmos alunos da chamada original.',
      });
    }

    await conexao.execute(
      'UPDATE chamadas SET data_aula = ? WHERE id = ?',
      [data_aula, chamadaId]
    );

    for (const aluno of alunos) {
      const presente = aluno.presente === true || aluno.presente === 1 ? 1 : 0;

      await conexao.execute(
        `UPDATE chamada_alunos
         SET presente = ?
         WHERE chamada_id = ? AND aluno_id = ?`,
        [presente, chamadaId, Number(aluno.aluno_id)]
      );
    }

    await conexao.commit();

    return res.json({ mensagem: 'Chamada atualizada com sucesso.' });
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
    return res.status(500).json({ erro: 'Erro interno ao editar a chamada.' });
  } finally {
    if (conexao) {
      conexao.release();
    }
  }
}

async function listarFrequenciaTurma(req, res) {
  const turmaId = Number(req.query.turma_id);
  const disciplinaId = Number(req.query.disciplina_id);

  if (
    !Number.isInteger(turmaId) ||
    turmaId <= 0 ||
    !Number.isInteger(disciplinaId) ||
    disciplinaId <= 0
  ) {
    return res.status(400).json({
      erro: "Informe uma turma e uma disciplina válidas.",
    });
  }

  try {
    // Confere se o professor autenticado tem vínculo com a turma e disciplina.
    const [vinculos] = await pool.query(
      `SELECT id
       FROM vinculos
       WHERE professor_id = ? AND turma_id = ? AND disciplina_id = ?`,
      [req.usuario.id, turmaId, disciplinaId]
    );

    if (vinculos.length === 0) {
      return res.status(403).json({
        erro: "Você não tem vínculo com esta turma e disciplina.",
      });
    }

    const [linhas] = await pool.query(
      `SELECT
         a.id AS aluno_id,
         a.nome_completo,
         a.matricula,
         COUNT(ca.chamada_id) AS total_aulas,
         COALESCE(SUM(CASE WHEN ca.presente = 1 THEN 1 ELSE 0 END), 0) AS presencas,
         COALESCE(SUM(CASE WHEN ca.presente = 0 THEN 1 ELSE 0 END), 0) AS faltas
       FROM alunos a
       LEFT JOIN chamadas c
         ON c.turma_id = a.turma_id
        AND c.disciplina_id = ?
       LEFT JOIN chamada_alunos ca
         ON ca.chamada_id = c.id
        AND ca.aluno_id = a.id
       WHERE a.turma_id = ?
       GROUP BY a.id, a.nome_completo, a.matricula
       ORDER BY a.nome_completo`,
      [disciplinaId, turmaId]
    );

    const resultado = linhas.map((linha) => {
      const totalAulas = Number(linha.total_aulas);
      const presencas = Number(linha.presencas);
      const faltas = Number(linha.faltas);
      const percentual =
        totalAulas === 0
          ? null
          : Number(((presencas / totalAulas) * 100).toFixed(2));

      let situacao = "SEM_REGISTROS";

      if (percentual !== null) {
        situacao =
          percentual >= 75 ? "DENTRO_DO_MINIMO" : "ABAIXO_DO_MINIMO";
      }

      return {
        aluno_id: Number(linha.aluno_id),
        nome_completo: linha.nome_completo,
        matricula: linha.matricula,
        total_aulas: totalAulas,
        presencas,
        faltas,
        percentual,
        situacao,
      };
    });

    return res.json(resultado);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({
      erro: "Erro ao calcular a frequência da turma.",
    });
  }
}

function dataISOValida(data) {
  return (
    typeof data === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(data) &&
    !Number.isNaN(Date.parse(`${data}T00:00:00Z`)) &&
    new Date(`${data}T00:00:00Z`).toISOString().slice(0, 10) === data
  );
}

// POST /api/professores/avaliacoes
async function criarAvaliacao(req, res) {
  const {
    turma_id,
    disciplina_id,
    titulo,
    tipo,
    data_avaliacao,
    valor_maximo,
    bimestre,
  } = req.body;

  const turmaId = Number(turma_id);
  const disciplinaId = Number(disciplina_id);
  const numeroBimestre = Number(bimestre);
  const valorMaximo = Number(valor_maximo);
  const tituloFinal = typeof titulo === "string" ? titulo.trim() : "";
  const tipoFinal = typeof tipo === "string" ? tipo.trim() : "";

  if (!Number.isInteger(numeroBimestre) || numeroBimestre < 1 || numeroBimestre > 4) {
    return res.status(400).json({ erro: "Selecione um bimestre válido, de 1 a 4." });
  }

  if (
    !Number.isInteger(turmaId) || turmaId <= 0 ||
    !Number.isInteger(disciplinaId) || disciplinaId <= 0
  ) {
    return res.status(400).json({ erro: "Informe uma turma e uma disciplina válidas." });
  }

  if (!tituloFinal || tituloFinal.length > 120) {
    return res.status(400).json({ erro: "O título é obrigatório e deve ter até 120 caracteres." });
  }

  if (!tipoFinal || tipoFinal.length > 40) {
    return res.status(400).json({ erro: "O tipo é obrigatório e deve ter até 40 caracteres." });
  }

  if (!dataISOValida(data_avaliacao)) {
    return res.status(400).json({ erro: "Informe a data no formato AAAA-MM-DD." });
  }

  if (
    !Number.isFinite(valorMaximo) ||
    valorMaximo <= 0 ||
    Math.abs(valorMaximo * 100 - Math.round(valorMaximo * 100)) > 0.000001
  ) {
    return res.status(400).json({
      erro: "O valor máximo deve ser maior que zero e ter no máximo duas casas decimais.",
    });
  }

  let conexao;
  let transacaoIniciada = false;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();
    transacaoIniciada = true;

    const [vinculos] = await conexao.execute(
      `SELECT id
       FROM vinculos
       WHERE professor_id = ? AND turma_id = ? AND disciplina_id = ?`,
      [req.usuario.id, turmaId, disciplinaId]
    );

    if (vinculos.length === 0) {
      await conexao.rollback();
      transacaoIniciada = false;
      return res.status(403).json({
        erro: "Você não tem vínculo com esta turma e disciplina.",
      });
    }

    const [alunos] = await conexao.execute(
      "SELECT id FROM alunos WHERE turma_id = ? ORDER BY id",
      [turmaId]
    );

    if (alunos.length === 0) {
      await conexao.rollback();
      transacaoIniciada = false;
      return res.status(400).json({
        erro: "Esta turma não possui alunos cadastrados.",
      });
    }

    const [resultado] = await conexao.execute(
      `INSERT INTO avaliacoes
         (professor_id, turma_id, disciplina_id, bimestre, titulo, tipo, data_avaliacao, valor_maximo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.usuario.id,
        turmaId,
        disciplinaId,
        numeroBimestre,
        tituloFinal,
        tipoFinal,
        data_avaliacao,
        valorMaximo,
      ]
    );

    const avaliacaoId = resultado.insertId;
    const placeholders = alunos.map(() => "(?, ?, NULL)").join(", ");
    const valores = alunos.flatMap((aluno) => [avaliacaoId, aluno.id]);

    await conexao.execute(
      `INSERT INTO notas (avaliacao_id, aluno_id, nota)
       VALUES ${placeholders}`,
      valores
    );

    await conexao.commit();
    transacaoIniciada = false;

    return res.status(201).json({
      mensagem: "Avaliação criada com sucesso.",
      avaliacao_id: avaliacaoId,
    });
  } catch (erro) {
    if (conexao && transacaoIniciada) await conexao.rollback();

    console.error(erro);
    return res.status(500).json({ erro: "Erro interno ao criar a avaliação." });
  } finally {
    if (conexao) conexao.release();
  }
}

// GET /api/professores/avaliacoes?turma_id=...&disciplina_id=...
async function listarAvaliacoes(req, res) {
  const turmaId = Number(req.query.turma_id);
  const disciplinaId = Number(req.query.disciplina_id);

  if (
    !Number.isInteger(turmaId) || turmaId <= 0 ||
    !Number.isInteger(disciplinaId) || disciplinaId <= 0
  ) {
    return res.status(400).json({ erro: 'Informe uma turma e uma disciplina válidas.' });
  }

  try {
    const [vinculos] = await pool.query(
      `SELECT id
       FROM vinculos
       WHERE professor_id = ? AND turma_id = ? AND disciplina_id = ?`,
      [req.usuario.id, turmaId, disciplinaId]
    );

    if (vinculos.length === 0) {
      return res.status(403).json({
        erro: 'Você não tem vínculo com esta turma e disciplina.',
      });
    }

    const [avaliacoes] = await pool.query(
      `SELECT
         av.id AS avaliacao_id,
         av.turma_id,
         av.disciplina_id,
         av.bimestre,
         av.titulo,
         av.tipo,
         DATE_FORMAT(av.data_avaliacao, '%Y-%m-%d') AS data_avaliacao,
         av.valor_maximo,
         COUNT(n.aluno_id) AS total_alunos,
         COUNT(n.nota) AS notas_lancadas,
         ROUND(AVG(n.nota), 2) AS media_turma
       FROM avaliacoes av
       LEFT JOIN notas n ON n.avaliacao_id = av.id
       WHERE av.professor_id = ? AND av.turma_id = ? AND av.disciplina_id = ?
       GROUP BY
         av.id, av.turma_id, av.disciplina_id, av.bimestre, av.titulo,
         av.tipo, av.data_avaliacao, av.valor_maximo
       ORDER BY av.data_avaliacao DESC, av.id DESC`,
      [req.usuario.id, turmaId, disciplinaId]
    );

    return res.json(avaliacoes);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao consultar as avaliações.' });
  }
}

// GET /api/professores/avaliacoes/:id
async function obterAvaliacao(req, res) {
  const avaliacaoId = Number(req.params.id);

  if (!Number.isInteger(avaliacaoId) || avaliacaoId <= 0) {
    return res.status(400).json({ erro: 'Número da avaliação inválido.' });
  }

  try {
    const [linhas] = await pool.query(
      `SELECT
         av.id AS avaliacao_id,
         av.turma_id,
         av.disciplina_id,
         av.bimestre,
         av.titulo,
         av.tipo,
         DATE_FORMAT(av.data_avaliacao, '%Y-%m-%d') AS data_avaliacao,
         av.valor_maximo,
         n.aluno_id,
         a.nome_completo,
         a.matricula,
         n.nota
       FROM avaliacoes av
       LEFT JOIN notas n ON n.avaliacao_id = av.id
       LEFT JOIN alunos a ON a.id = n.aluno_id
       WHERE av.id = ? AND av.professor_id = ?
       ORDER BY a.nome_completo`,
      [avaliacaoId, req.usuario.id]
    );

    if (linhas.length === 0) {
      return res.status(404).json({ erro: 'Avaliação não encontrada.' });
    }

    const avaliacao = {
      avaliacao_id: linhas[0].avaliacao_id,
      turma_id: linhas[0].turma_id,
      disciplina_id: linhas[0].disciplina_id,
      bimestre: linhas[0].bimestre,
      titulo: linhas[0].titulo,
      tipo: linhas[0].tipo,
      data_avaliacao: linhas[0].data_avaliacao,
      valor_maximo: Number(linhas[0].valor_maximo),
    };

    const alunos = linhas
      .filter((linha) => linha.aluno_id !== null)
      .map((linha) => ({
        aluno_id: linha.aluno_id,
        nome_completo: linha.nome_completo,
        matricula: linha.matricula,
        nota: linha.nota === null ? null : Number(linha.nota),
      }));

    return res.json({ avaliacao, alunos });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao consultar esta avaliação.' });
  }
}

// PUT /api/professores/avaliacoes/:id/notas
async function salvarNotasAvaliacao(req, res) {
  const avaliacaoId = Number(req.params.id);
  const { alunos } = req.body;

  if (!Number.isInteger(avaliacaoId) || avaliacaoId <= 0) {
    return res.status(400).json({ erro: 'Número da avaliação inválido.' });
  }

  if (!Array.isArray(alunos) || alunos.length === 0) {
    return res.status(400).json({ erro: 'Informe as notas dos alunos.' });
  }

  const idsRecebidos = new Set();
  const registros = [];

  for (const aluno of alunos) {
    const alunoId = Number(aluno?.aluno_id);

    if (
      !Number.isInteger(alunoId) ||
      alunoId <= 0 ||
      idsRecebidos.has(alunoId) ||
      !Object.prototype.hasOwnProperty.call(aluno, 'nota')
    ) {
      return res.status(400).json({ erro: 'Há dados inválidos na lista de notas.' });
    }

    let nota = null;

    if (aluno.nota !== null) {
      if (
        typeof aluno.nota === 'string' && aluno.nota.trim() === ''
      ) {
        return res.status(400).json({ erro: 'A nota deve ser um número ou nula.' });
      }

      nota = Number(aluno.nota);

      if (
        !Number.isFinite(nota) ||
        nota < 0 ||
        Math.abs(nota * 100 - Math.round(nota * 100)) > 0.000001
      ) {
        return res.status(400).json({
          erro: 'As notas devem ser números não negativos com até duas casas decimais.',
        });
      }
    }

    idsRecebidos.add(alunoId);
    registros.push({ alunoId, nota });
  }

  let conexao;
  let transacaoIniciada = false;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();
    transacaoIniciada = true;

    const [avaliacoes] = await conexao.execute(
      `SELECT id, valor_maximo
       FROM avaliacoes
       WHERE id = ? AND professor_id = ?
       FOR UPDATE`,
      [avaliacaoId, req.usuario.id]
    );

    if (avaliacoes.length === 0) {
      await conexao.rollback();
      transacaoIniciada = false;
      return res.status(404).json({ erro: 'Avaliação não encontrada.' });
    }

    const valorMaximo = Number(avaliacoes[0].valor_maximo);

    if (registros.some((registro) => registro.nota !== null && registro.nota > valorMaximo)) {
      await conexao.rollback();
      transacaoIniciada = false;
      return res.status(400).json({
        erro: `A nota não pode ser maior que ${valorMaximo}.`,
      });
    }

    const placeholders = registros.map(() => '?').join(', ');
    const ids = registros.map((registro) => registro.alunoId);

    const [notasExistentes] = await conexao.execute(
      `SELECT aluno_id
       FROM notas
       WHERE avaliacao_id = ? AND aluno_id IN (${placeholders})`,
      [avaliacaoId, ...ids]
    );

    if (notasExistentes.length !== registros.length) {
      await conexao.rollback();
      transacaoIniciada = false;
      return res.status(400).json({
        erro: 'Um ou mais alunos não pertencem a esta avaliação.',
      });
    }

    for (const registro of registros) {
      await conexao.execute(
        `UPDATE notas
         SET nota = ?
         WHERE avaliacao_id = ? AND aluno_id = ?`,
        [registro.nota, avaliacaoId, registro.alunoId]
      );
    }

    await conexao.commit();
    transacaoIniciada = false;

    return res.json({
      mensagem: 'Notas salvas com sucesso.',
      notas_atualizadas: registros.length,
    });
  } catch (erro) {
    if (conexao && transacaoIniciada) await conexao.rollback();

    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao salvar as notas.' });
  } finally {
    if (conexao) conexao.release();
  }
}
// PUT /api/professores/avaliacoes/:id
async function editarAvaliacao(req, res) {
  const avaliacaoId = Number(req.params.id);
  const {bimestre,titulo,tipo,data_avaliacao,valor_maximo,} = req.body || {};

  const numeroBimestre = Number(bimestre);
  const tituloFinal = typeof titulo === "string" ? titulo.trim() : "";
  const tipoFinal = typeof tipo === "string" ? tipo.trim() : "";
  const valorTexto = String(valor_maximo ?? "").trim().replace(",", ".");
  const valorMaximo = Number(valorTexto);
  const quantidadeLetras = tituloFinal.match(/[A-Za-zÀ-ÿ]/g)?.length ?? 0;
  const nomeValido = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-.,:ºª]*$/.test(tituloFinal);
  const tiposPermitidos = ["Prova", "Trabalho", "Atividade", "Seminário", "Outros"];

  if (!Number.isInteger(avaliacaoId) || avaliacaoId <= 0) {
    return res.status(400).json({ erro: "Número da avaliação inválido." });
  }

  if (!Number.isInteger(numeroBimestre) || numeroBimestre < 1 || numeroBimestre > 4) {
    return res.status(400).json({ erro: "Selecione um bimestre válido, de 1 a 4." });
  }

  if (
    quantidadeLetras < 3 ||
    tituloFinal.length > 120 ||
    !nomeValido
  ) {
    return res.status(400).json({
      erro: "Digite um nome com pelo menos 3 letras e sem números.",
    });
  }

  if (!tiposPermitidos.includes(tipoFinal)) {
    return res.status(400).json({ erro: "Selecione um tipo de avaliação válido." });
  }

  if (!dataISOValida(data_avaliacao)) {
    return res.status(400).json({ erro: "Informe uma data válida." });
  }

  if (
    !/^\d+(?:\.\d{1,2})?$/.test(valorTexto) ||
    !Number.isFinite(valorMaximo) ||
    valorMaximo <= 0
  ) {
    return res.status(400).json({
      erro: "O valor máximo deve ser maior que zero e ter até duas casas decimais.",
    });
  }

  let conexao;
  let transacaoIniciada = false;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();
    transacaoIniciada = true;

    const [avaliacoes] = await conexao.execute(
      `SELECT id, turma_id, disciplina_id
       FROM avaliacoes
       WHERE id = ? AND professor_id = ?
       FOR UPDATE`,
      [avaliacaoId, req.usuario.id]
    );

    if (avaliacoes.length === 0) {
      await conexao.rollback();
      transacaoIniciada = false;
      return res.status(404).json({ erro: "Avaliação não encontrada." });
    }

    const avaliacao = avaliacoes[0];

    const [vinculos] = await conexao.execute(
      `SELECT id
       FROM vinculos
       WHERE professor_id = ? AND turma_id = ? AND disciplina_id = ?`,
      [req.usuario.id, avaliacao.turma_id, avaliacao.disciplina_id]
    );

    if (vinculos.length === 0) {
      await conexao.rollback();
      transacaoIniciada = false;
      return res.status(403).json({
        erro: "Você não tem vínculo com esta turma e disciplina.",
      });
    }

    const [notas] = await conexao.execute(
      `SELECT MAX(nota) AS maior_nota
       FROM notas
       WHERE avaliacao_id = ?`,
      [avaliacaoId]
    );

    if (
      notas[0].maior_nota !== null &&
      Number(notas[0].maior_nota) > valorMaximo
    ) {
      await conexao.rollback();
      transacaoIniciada = false;
      return res.status(400).json({
        erro: `O valor máximo não pode ser menor que uma nota já lançada (${notas[0].maior_nota}).`,
      });
    }

    await conexao.execute(
      `UPDATE avaliacoes
       SET bimestre = ?, titulo = ?, tipo = ?, data_avaliacao = ?, valor_maximo = ?
       WHERE id = ? AND professor_id = ?`,
      [
        numeroBimestre,
        tituloFinal,
        tipoFinal,
        data_avaliacao,
        valorMaximo,
        avaliacaoId,
        req.usuario.id,
      ]
    );

    await conexao.commit();
    transacaoIniciada = false;

    return res.json({ mensagem: "Avaliação atualizada com sucesso." });
  } catch (erro) {
    if (conexao && transacaoIniciada) {
      await conexao.rollback();
    }

    console.error(erro);
    return res.status(500).json({ erro: "Erro interno ao editar a avaliação." });
  } finally {
    if (conexao) {
      conexao.release();
    }
  }
}
async function excluirAvaliacao(req, res) {
  const avaliacaoId = Number(req.params.id);

  if (!Number.isInteger(avaliacaoId) || avaliacaoId <= 0) {
    return res.status(400).json({ erro: "ID de avaliação inválido." });
  }

  try {
    const [resultado] = await pool.execute(
      `DELETE FROM avaliacoes
       WHERE id = ? AND professor_id = ?`,
      [avaliacaoId, req.usuario.id],
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: "Avaliação não encontrada." });
    }

    return res.json({ mensagem: "Avaliação apagada com sucesso." });
  } catch (erro) {
    console.error("Erro ao apagar avaliação:", erro);
    return res.status(500).json({ erro: "Não foi possível apagar a avaliação." });
  }
}

// GET /api/professores/perfil
async function obterPerfilProfessor(req, res) {
  try {
    const [linhas] = await pool.query(
      `SELECT id, nome_completo, email, criado_em
       FROM professores
       WHERE id = ?`,
      [req.usuario.id]
    );

    if (linhas.length === 0) {
      return res.status(404).json({ erro: 'Professor não encontrado.' });
    }

    return res.json(linhas[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao carregar o perfil.' });
  }
}

module.exports = { cadastrar, cadastrarPeloCoordenador, listar, remover, listarVinculosProfessor, registrarChamada, listarChamadas, obterChamada, editarChamada, listarFrequenciaTurma, criarAvaliacao, listarAvaliacoes, obterAvaliacao, salvarNotasAvaliacao, excluirAvaliacao, obterPerfilProfessor, editarAvaliacao };