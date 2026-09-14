require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const coordenadorRoutes = require('./routes/coordenadorRoutes');
const professorRoutes = require('./routes/professorRoutes');
const alunoRoutes = require('./routes/alunoRoutes');

const app = express();

app.use(cors()); // permite que o app (rodando em outro endereço) fale com a API
app.use(express.json()); // permite receber JSON no corpo das requisições

// Rota simples só pra confirmar que a API está de pé
app.get('/', (req, res) => {
  res.json({ mensagem: 'API do CONSELHO+ está rodando 🎓' });
});

app.use('/api/auth', authRoutes);
app.use('/api/coordenadores', coordenadorRoutes);
app.use('/api/professores', professorRoutes);
app.use('/api/alunos', alunoRoutes);

const PORTA = process.env.PORT || 3000;

app.listen(PORTA, () => {
  console.log(`API do CONSELHO+ rodando em http://localhost:${PORTA}`);
});