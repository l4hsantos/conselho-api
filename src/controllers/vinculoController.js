const pool = require('../config/db');

// GET /api/vinculos
// Lista os vínculos com os dados do professor, disciplina e turma.
async function listar(req, res) {
  try {
    const [linhas] = await pool.query(`
      SELECT
        v.id AS vinculo_id,
        p.id AS professor_id,
        p.nome_completo,
        p.email,
        d.id AS disciplina_id,
        d.nome AS disciplina,
        t.id AS turma_id,
        t.ano AS turma_ano,
        t.letra AS turma_letra
      FROM vinculos v
      INNER JOIN professores p ON p.id = v.professor_id
      INNER JOIN disciplinas d ON d.id = v.disciplina_id
      INNER JOIN turmas t ON t.id = v.turma_id
      ORDER BY p.nome_completo, d.nome, t.ano, t.letra
    `);

    return res.json(linhas);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({
      erro: 'Erro interno ao listar vínculos.',
    });
  }
}

// GET /api/vinculos/disciplinas
async function listarDisciplinas(req, res) {
  try {
    const [linhas] = await pool.query(
      'SELECT id, nome FROM disciplinas ORDER BY nome'
    );

    return res.json(linhas);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({
      erro: 'Erro interno ao listar disciplinas.',
    });
  }
}

// POST /api/vinculos

async function cadastrar(req, res) {
  const { professorId, disciplinaId, turmaId, turmaIds } = req.body;

  // Aceita várias turmas (turmaIds) ou uma turma (turmaId)
  const turmas = turmaIds ?? (turmaId !== undefined ? [turmaId] : []);

  const idsValidos = (id) =>
    id !== undefined &&
    id !== null &&
    id !== '' &&
    Number.isInteger(Number(id)) &&
    Number(id) > 0;

  if (
    !idsValidos(professorId) ||
    !idsValidos(disciplinaId) ||
    !Array.isArray(turmas) ||
    turmas.length === 0 ||
    !turmas.every(idsValidos)
  ) {
    return res.status(400).json({
      erro: 'Selecione um professor, uma disciplina e pelo menos uma turma válida.',
    });
  }

  // Converte os IDs para números e remove turmas repetidas
  const turmasUnicas = [...new Set(turmas.map(Number))];

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    const valores = turmasUnicas.map((turma) => [
      Number(professorId),
      Number(disciplinaId),
      turma,
    ]);

    for (const valoresVinculo of valores) {
      await conexao.query(
        `INSERT INTO vinculos
          (professor_id, disciplina_id, turma_id)
         VALUES (?, ?, ?)`,
        valoresVinculo
      );
    }

    await conexao.commit();

    return res.status(201).json({
      mensagem: 'Vínculos cadastrados com sucesso.',
      quantidade: turmasUnicas.length,
    });
  } catch (erro) {
    if (conexao) {
      await conexao.rollback();
    }

    if (erro.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        erro: 'Uma ou mais turmas já estão vinculadas a esse professor e disciplina. Nenhuma alteração foi salva.',
      });
    }

    if (
      erro.code === 'ER_NO_REFERENCED_ROW_2' ||
      erro.code === 'ER_NO_REFERENCED_ROW'
    ) {
      return res.status(400).json({
        erro: 'Professor, disciplina ou turma não encontrado.',
      });
    }

    console.error(erro);
    return res.status(500).json({
      erro: 'Erro interno ao cadastrar vínculos.',
    });
  } finally {
    if (conexao) {
      conexao.release();
    }
  }
}

// DELETE /api/vinculos/:id
async function remover(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      erro: 'ID do vínculo inválido.',
    });
  }

  try {
    const [resultado] = await pool.query(
      'DELETE FROM vinculos WHERE id = ?',
      [id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        erro: 'Vínculo não encontrado.',
      });
    }

    return res.json({
      mensagem: 'Vínculo removido com sucesso.',
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({
      erro: 'Erro interno ao remover vínculo.',
    });
  }
}

module.exports = {listar,listarDisciplinas,cadastrar,remover,
};