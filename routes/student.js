const {Router} = require("express")
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const {Student} = require("../db")
const {z, string} = require("zod")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const studentRouter = Router()
require("dotenv").config()


const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: 'ashithkumargowda.aiet@gmail.com', 
        pass: 'momz dgnz diha lmpy '   
    }
});

studentRouter.post("/signup", async (req, res) => {
    try {

        const requireBody = z.object({
            email: z.string().email(),
            password: z.string().max(20),
            name: z.string(),
            year: z.string(),
            usn: z.string().optional()
        })

        const safeParse = requireBody.safeParse(req.body)
        

        if (!safeParse.success) {
            res.json({
                message: "Incorrect format",
                error: safeParse.error
            })
            return
        }

        const { email, password, name, year, usn } = req.body

        const hashPassword = await bcrypt.hash(password,5)
        
  
        const verificationToken = crypto.randomBytes(32).toString('hex')

        await Student.create({
            email: email,
            password: hashPassword,
            name: name,
            year: year,
            usn: usn,
            verified: false,
            verificationToken: verificationToken
        })

     
        const verificationLink = `${process.env.VERIFICATION_DOMAIN}?token=${verificationToken}&email=${email}`
        
        const emailSend = await transporter.sendMail({
            from: 'ashithkumargowda.aiet@gmail.com',
            to: email,
            subject: 'Email Verification',
            html: `<h3>Hello ${name},</h3><p>Please verify your email by clicking on the link below:</p>
                   <a href="${verificationLink}">Verify Email</a>`
        })

        res.json({
            message: "Signup successful! Please check your email to verify your account."
        })

    } catch (error) {
      
        if (error.name === 'ValidationError') {
            for (let field in error.errors) {
                const err = error.errors[field]
                if (err.kind == 'enum') {
                    res.json({ message: `invalid year ${err.value}` })
                }
            }
        } else {
            res.json({ message: "Invalid" })
        }
    }
})

// Email verification route
studentRouter.get("/verify-email", async (req, res) => {
    const { token, email } = req.query
    try {
        const student = await Student.findOne({ email: email, verificationToken: token })

        if (!student) {
            return res.status(400).json({ message: "Invalid token or email" })
        }

        
        student.verified = true;
        student.verificationToken = null;
        await student.save();

        res.send({ message: "Email verified successfully" })
    } catch (error) {
        res.status(500).send({ message: "Server error" })
    }
})

module.exports={
    studentRouter:studentRouter
}