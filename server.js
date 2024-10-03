const express = require("express")
const app = express()

require("dotenv").config()
const dbConnect = process.env.DbUrl
const PORT = process.env.PORT

const mongoose = require("mongoose")


const {studentRouter} = require("./routes/student")
app.use(express.json())

app.use("/student/v1",studentRouter)

async function connection(){
    await mongoose.connect(dbConnect)
    app.listen(PORT,()=>{
        console.log(`http://localhost:${PORT}/signup`)
    })
}

connection()