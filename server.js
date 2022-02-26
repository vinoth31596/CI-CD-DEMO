const Pool = require('pg').Pool;

const pool = new Pool({
  user: 'vinothmani',
  host: 'localhost',
  database: 'vinothmani',
  password:'',
  port: 5432,
});

module.exports = pool;