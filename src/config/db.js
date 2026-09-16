// Conexão com o MySQL usando "pool" de conexões
// (o pool reaproveita conexões em vez de abrir uma nova a cada consulta)

require('dotenv').config();
console.log('DB_USER carregado:', process.env.DB_USER);
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;