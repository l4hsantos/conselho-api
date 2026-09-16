require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const coordenadorRoutes = require('./routes/coordenadorRoutes');
const professorRoutes = require('./routes/professorRoutes');
const alunoRoutes = require('./routes/alunoRoutes');
const turmaRoutes = require('./routes/turmaRoutes');
const vinculoRoutes = require('./routes/vinculoRoutes');

const app = express();

app.use(cors()); // permite que o app (rodando em outro endereço) fale com a API
app.use(express.json()); // permite receber JSON no corpo das requisições
app.use('/api/vinculos', vinculoRoutes);

app.get('/', (req, res) => {
  res.json({ mensagem: 'API do CONSELHO+ está rodando' });
});

app.use('/api/auth', authRoutes);
app.use('/api/coordenadores', coordenadorRoutes);
app.use('/api/professores', professorRoutes);
app.use('/api/alunos', alunoRoutes);
app.use('/api/turmas', turmaRoutes);

const PORTA = process.env.PORT || 3000;

app.listen(PORTA, () => {
  console.log(`API do CONSELHO+ rodando em http://localhost:${PORTA}`);
});