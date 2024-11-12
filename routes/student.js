const { Router } = require("express")
const studentRouter = Router()
const nodemailer = require('nodemailer')
const crypto = require('crypto')
const bcrypt = require("bcrypt")
const { z } = require("zod")
const jwt = require("jsonwebtoken")
const { zodVerify } = require("../middlewares/zodregistration")
const { zodLoginVerify } = require("../middlewares/zodlogin")
const { verifyJwt } = require("../middlewares/authJwtStudent")
require("dotenv").config()
const SECRET = process.env.JWT_SECRET_STUDENT

const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ashithkumargowda.aiet@gmail.com',
        pass: 'momz dgnz diha lmpy '
    }
});

studentRouter.post("/signup", zodVerify, async (req, res) => {
    try {

        const { email, password, name, year, usn, room, block } = req.body
        console.log(email)
        const user = await prisma.student.findFirst({ where: { email: email } })
        if (user) {
            res.status(403).json({ message: "User already exists" })
            return
        }


        const hashPassword = await bcrypt.hash(password, 10)
        const verificationToken = Math.floor(100000 + Math.random() * 900000)

        await prisma.student.create({
            data: {
                email,
                password: hashPassword,
                name,
                year,
                usn,
                room,
                block,
                verified: false,
                verificationToken
            }

        })


        const token = jwt.sign({ email }, SECRET)


        await transporter.sendMail({
            from: 'ashithkumargowda.aiet@gmail.com',
            to: email,
            subject: 'Email Verification',
            html: `<h3>Hello ${name},</h3><p>Please verify your email using the following OTP:</p>
                   <p><strong>${verificationToken}</strong></p>`
        })

        res.json({
            message: "Signup successful! Please check your email to verify your account.",
            token: token
        })

    } catch (error) {

        console.error('Error during signup:', error)
        res.status(500).json({ message: "An error occurred during signup" })

    }
})


studentRouter.get("/verifyEmail", async (req, res) => {
    const { token, email } = req.body
    try {
        const student = await prisma.student.findFirst({
            where: {
                email: email,
                verificationToken: token
            }
        })
        if (!student) {
            return res.status(400).json({ message: "Invalid token or email", verified: false })
        }

        await prisma.student.update({
            where: { email: email },
            data: {
                verified: true,
                verificationToken: null
            }
        })
        res.json({ message: "Email verified successfully", verified: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Server error" })
    }
})



studentRouter.get("/login", zodLoginVerify, async (req, res) => {
    const { email, password } = req.body
    const user = await prisma.student.findFirst({
        where: {
            email: email
        }
    })

    if (user) {
        bcrypt.compare(password, user.password, (err, sucess) => {
            if (err) {
                res.json({ message: "invalid credentials" })
            }
            else {
                const token = jwt.sign({ email: email }, SECRET)
                res.json({ valid: true, token, message: "Logged in Sucessfully" })
            }
        })
    }
    else {
        res.json({ message: "user not found please register" })
    }
})

studentRouter.post("/forgotPassword", async (req, res) => {
    try {

        const { email } = req.body
        const user = await prisma.student.findFirst({ where: { email: email } })

        if (!user) {
            return res.status(400).json({ message: "user not found pls enter corect email.", valid: false })
        }

        const resetToken = Math.floor(100000 + Math.random() * 900000)

        await prisma.student.update({
            where: {
                id: user.id
            },
            data: {
                resetToken: resetToken
            }
        })

        await transporter.sendMail({
            from: 'ashithkumargowda.aiet@gmail.com',
            to: email,
            subject: 'Email Verification',
            html: `<h3>Hello ${user.name},</h3><p>Please verify your email using the following OTP:</p>
                   <p><strong>${verificationToken}</strong></p>`
        })

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json('Error sending email.');
            }
            res.json({ message: 'pls enter the otp sent to your email' });
        })
    } catch (error) {
        res.json({ message: "server error pls try agin later" })
    }
})

studentRouter.get('/resetPassword', async (req, res) => {
    const { token } = req.body
    const user = await prisma.student.findFirst({ where: { resetToken: token } })
    if (!user) {
        return res.status(400).send('Invalid token.');
    }
    else {
        await prisma.student.update({
            where: {
                email: user.email
            },
            data: {
                resetToken: null
            }
        })
        res.json({ message: "Reset Password", valid: true })
    }
})

studentRouter.post("/updatePassword", async (req, res) => {

    try {
        const { email } = req.body
        if (email) {
            const finduser = prisma.student.findFirst({
                where: {
                    email: email
                }
            })

            if (finduser) {
                const requireBody = z.object({
                    email: z.string().email(),
                    password: z.string().max(20),
                })

                const safeParse = requireBody.safeParse(req.body)

                if (!safeParse.success) {
                    res.status(411).json({
                        message: "Incorrect format please enter email or password in correct format and password must be les than 20 characters",
                        error: safeParse.error.issues[0].message
                    })
                    return
                }

                const email = safeParse.data.email
                const password = safeParse.data.password
                const hashPassword = await bcrypt.hash(password, 5)

                const user = await prisma.admin.findFirst({ where: { email: email } })
                if (!user) {
                    res.json({ message: "Enter correct email!", valid: false })
                }
                await prisma.admin.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        password: hashPassword,
                        resetToken: null
                    }
                })
                res.json({ message: "password changed sucessfully", valid: true })
            }
            else {
                res.json({ message: "cannot updatePassword" })
            }

        }
        else {
            res.json({ message: "cannot find user" })
        }


    } catch (error) {
        res.json({ message: "password change failed", valid: false })
    }
})

studentRouter.get("/me", async (req, res) => {
    const email = req.body
    const user = await prisma.student.findFirst({ where: { email: email } })

    if (user) {
        res.json({ message: "user found", user: user })
    }
})

studentRouter.get("/requestOuting", async (req, res) => {
    const email = req.email
    const user = await prisma.student.findFirst({ where: { email: email } })
    if (user.outing) {

        res.json({ message: "Allowed", valid: true })
    }
    else {
        res.json({ message: " Not Allowed", valid: false })
    }
})

// studentRouter.get("/checkVerified", async (req, res) => {
//     const { email } = req.query
//     try {
//       const student = await prisma.student.findFirst({
//         where: { email: email }
//       })
//       if (!student) {
//         return res.status(404).json({ message: "Student not found", verified: false })
//       }
//       res.json({ verified: student.verified })
//     } catch (error) {
//       res.status(500).json({ message: "Server error" })
//     }
//   })


module.exports = {
    studentRouter: studentRouter
}