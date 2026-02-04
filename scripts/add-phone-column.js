require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg')

async function addPhoneColumn() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    })

    try {
        console.log('🔌 Conectando ao banco de dados...')
        await client.connect()

        console.log('🔧 Adicionando coluna phone...')
        await client.query('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;')

        console.log('✅ Coluna phone adicionada com sucesso!')
    } catch (err) {
        console.error('❌ Erro:', err.message)
    } finally {
        await client.end()
    }
}

addPhoneColumn()
