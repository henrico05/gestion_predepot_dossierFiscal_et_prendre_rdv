import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Pool, types } = pg

types.setTypeParser(1082, value => value)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  ssl: process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: false }
  : false,
  
  // Fuseau horaire utilisé par les connexions Node.js → PostgreSQL
  options: '-c timezone=Indian/Antananarivo'
})

export async function verifyPostGresConnection() {
  try {
    const client = await pool.connect()
    console.log('✅ PostgreSQL connecté')
    client.release()
    
    return true
    
  } catch (error) {
    console.error('❌ PostgreSQL non connecté')
    console.error('Code :', error.code)
    
    if (error.code === 'ECONNREFUSED') {
      console.error(
        '🚨 PostgreSQL est arrêté ou le port 5432 est inaccessible.'
      )
    } else if (error.code === '28P01') {
      console.error(
        '🔐 Identifiants PostgreSQL incorrects.'
      )
    } else if (error.code === '3D000') {
      console.error(
        '🗄️ La base de données demandée n’existe pas.'
      )
    } else {
      console.error(
        '⚠️ Erreur PostgreSQL :',
        error.message || error
      )
    }
    
    return false
  }
}

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL:', err)
})

export default pool
