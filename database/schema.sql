-- ============================================
-- (para rodar no terminal: 
-- mysql -u root -p < schema.sql)

CREATE DATABASE IF NOT EXISTS conselho_mais
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE conselho_mais;

-- ---------------------------------------------
-- Coordenadores
-- CHAVE DE ACESSO:

CREATE TABLE IF NOT EXISTS coordenadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_completo VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------
-- Professores
-- CHAVE DE ACESSO:
CREATE TABLE IF NOT EXISTS professores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_completo VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------
-- Alunos
-- O coordenador cria a linha primeiro (pré-cadastro).
-- O aluno só "ativa" depois, definindo a própria senha.

CREATE TABLE IF NOT EXISTS alunos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  matricula VARCHAR(30) NOT NULL UNIQUE,
  nome_completo VARCHAR(150) NOT NULL,
  data_nascimento DATE NOT NULL,
  senha_hash VARCHAR(255) NULL,
  ativado TINYINT(1) NOT NULL DEFAULT 0,

  -- dados pessoais extras (visíveis só para coordenador e o próprio aluno)
  telefone VARCHAR(20) NULL,
  endereco VARCHAR(255) NULL,
  nome_responsavel VARCHAR(150) NULL,

  cadastrado_por INT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (cadastrado_por) REFERENCES coordenadores(id)
    ON DELETE SET NULL
);

-- ---------------------------------------------
-- Turmas do Ensino Médio (1ºA, 1ºB, 2ºA, 2ºB, 3ºA, 3ºB)

CREATE TABLE IF NOT EXISTS turmas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ano TINYINT NOT NULL,           -- 1, 2 ou 3
  letra CHAR(1) NOT NULL,         -- A ou B
  UNIQUE KEY turma_unica (ano, letra)
);

INSERT IGNORE INTO turmas (ano, letra) VALUES
  (1, 'A'), (1, 'B'),
  (2, 'A'), (2, 'B'),
  (3, 'A'), (3, 'B');