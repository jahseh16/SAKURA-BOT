const path = require('path')
const { Low, JSONFile } = require('./lowdb')

const dbPath = path.join(__dirname, '../database.json')

// Crear archivo de base de datos si no existe
const fs = require('fs')
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ users: {}, chats: {}, settings: {} }, null, 2))
}

// Crear base de datos
global.db = new Low(new JSONFile(dbPath))
if (!global.db.data) global.db.data = { users: {}, chats: {}, settings: {} }

// Cargar base de datos
global.loadDatabase = async function () {
  global.db.read()
  return global.db.data
}

// Guardar automáticamente cada 10 segundos
setInterval(() => {
  try {
    global.db.write()
  } catch (e) {
    console.error('Error guardando DB:', e)
  }
}, 10000)

module.exports = global.db
