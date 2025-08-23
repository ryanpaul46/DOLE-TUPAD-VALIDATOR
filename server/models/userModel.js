import { pool } from '../db.js';


export async function initUsersTable() {
await pool.query(`
CREATE TABLE IF NOT EXISTS users (
id SERIAL PRIMARY KEY,
first_name TEXT NOT NULL,
last_name TEXT NOT NULL,
username TEXT UNIQUE NOT NULL,
email TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
role TEXT NOT NULL DEFAULT 'client', -- 'client' | 'admin'
created_at TIMESTAMP DEFAULT NOW()
);
`);
}


export async function findUserByUsernameOrEmail(login) {
const { rows } = await pool.query(
'SELECT * FROM users WHERE username=$1 OR email=$1 LIMIT 1',
[login]
);
return rows[0] || null;
}


export async function createUser({ first_name, last_name, username, email, password_hash, role = 'client' }) {
const { rows } = await pool.query(
`INSERT INTO users (first_name, last_name, username, email, password_hash, role)
VALUES ($1,$2,$3,$4,$5,$6)
RETURNING id, first_name, last_name, username, email, role, created_at`,
[first_name, last_name, username, email, password_hash, role]
);
return rows[0];
}