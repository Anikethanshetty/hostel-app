const express = require("express")
const app = express();
const { PrismaClient } = require("@prisma/client")
require("dotenv").config();
const PORT = process.env.PORT

const prisma = new PrismaClient()

const { studentRouter } = require("./routes/student");
const { adminRouter } = require("./routes/admin");
app.use(express.json());

app.use("/student/v1", studentRouter)
app.use("/admin/v1", adminRouter)


async function connection() {
  try {
    
    await prisma.$connect()
    console.log("Connected to the database")

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}/signup`)
    });
  } catch (error) {
    console.error("Failed to connect to the database", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect();
  }
}

connection()
