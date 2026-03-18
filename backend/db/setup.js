// Run this once: node db/setup.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function setup() {
  console.log('Setting up database...');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(schema);
    console.log('✅ Database schema created successfully!');
    console.log('Default admin login:');
    console.log('  Email:    admin@embroidery.local');
    console.log('  Password: Admin1234!');
    console.log('Change your password immediately after login!');
  } catch (err) {
    console.error('Error setting up database:', err.message);
  } finally {
    await pool.end();
  }
}

setup();
