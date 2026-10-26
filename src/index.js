const express = require("express")
const { PrismaClient } = require("../generated/prisma/client")
const {PrismaPg} = require("@prisma/adapter-pg")
const app = express()
const port = 3000

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
})

const prisma = new PrismaClient({ adapter })

app.get("/health", (req, res) => {
    res.json({status:"OK"})
})

async function testConnection() {
    try {
        await prisma.$queryRaw`SELECT 1`
        console.log("✅ Database connection successful")
    } catch (error) {
        console.error("❌ Database connection failed")
        console.error(error)
    }
}

testConnection()

app.listen(port, () => {
    console.log("Server started on port 3000")
})

