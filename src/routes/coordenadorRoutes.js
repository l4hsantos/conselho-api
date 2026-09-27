const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const {
  cadastrar,
  listar,
  buscarPerfil,
  atualizarPerfil,
} = require('../controllers/coordenadorController');

const {
  autenticar,
  somenteCoordenador,
} = require('../middlewares/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },

  filename: (req, file, cb) => {
    const extensao = path.extname(file.originalname).toLowerCase();

    cb(
      null,
      `coordenador-${req.usuario.id}-${Date.now()}${extensao}`
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Formato de imagem inválido. Use JPG, PNG ou WEBP.'
        )
      );
    }
  },
});

// Cadastro
router.post('/cadastro', cadastrar);

// Listar coordenadores
router.get(
  '/',
  autenticar,
  somenteCoordenador,
  listar
);

// Buscar perfil
router.get(
  '/perfil',
  autenticar,
  somenteCoordenador,
  buscarPerfil
);

// Atualizar telefone
router.put(
  '/perfil',
  autenticar,
  somenteCoordenador,
  atualizarPerfil
);

// Upload da foto de perfil
router.post(
  '/perfil/foto',
  autenticar,
  somenteCoordenador,
  upload.single('foto'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          erro: 'Nenhuma foto foi enviada.',
        });
      }

      const fotoUrl = `/uploads/${req.file.filename}`;

      const pool = require('../config/db');

      await pool.query(
        `
        UPDATE coordenadores
        SET foto_url = ?
        WHERE id = ?
        `,
        [fotoUrl, req.usuario.id]
      );

      return res.json({
        mensagem: 'Foto atualizada com sucesso.',
        fotoUrl,
      });
    } catch (erro) {
      console.error(erro);

      return res.status(500).json({
        erro: 'Erro interno ao salvar a foto.',
      });
    }
  }
);

module.exports = router;