//colocar como segundo argumento da rota, ex: router.get('/rota-protegida', autenticar, minhaFuncao)

require('dotenv').config();
const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization; // formato esperado: "Bearer TOKEN_AQUI"

  if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não enviado. Faça login novamente.' });
  }

  const token = cabecalho.split(' ')[1];

  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = dados; // { id, perfil }
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

// Middleware extra: só deixa passar se o perfil logado for "coordenador"
function somenteCoordenador(req, res, next) {
  if (req.usuario?.perfil !== 'coordenador') {
    return res.status(403).json({ erro: 'Apenas coordenadores podem fazer isso.' });
  }
  next();
}

module.exports = { autenticar, somenteCoordenador };