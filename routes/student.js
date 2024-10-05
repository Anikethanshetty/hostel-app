const {Router} = require("express")
const studentRouter = Router()
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const {Student} = require("../db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const {zodVerify} = require("../middlewares/zodregistration")
const {zodLoginVerify} = require("../middlewares/zodlogin")
const {verifyJwt} = require("../middlewares/authJwt");
require("dotenv").config()
const SECRET = process.env.JWT_SECRET_STUDENT

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: 'ashithkumargowda.aiet@gmail.com', 
        pass: 'momz dgnz diha lmpy '   
    }
});

studentRouter.post("/signup", zodVerify, async (req, res) => {
    try {
         
        const { email, password, name, year, usn } = req.body

        const user = await Student.findOne({ email })
        if (user) {
            res.status(403).json({ message: "User already exists" })
            return
        }

     
        const hashPassword = await bcrypt.hash(password, 10)
        const verificationToken = crypto.randomBytes(32).toString('hex')

        await Student.create({
            email,
            password: hashPassword,
            name,
            year,
            usn,
            verified: false,
            verificationToken
        })

      
        const token = jwt.sign({ email }, SECRET)
    
        const verificationLink = `${process.env.VERIFICATION_DOMAIN}?token=${verificationToken}&email=${email}`

        await transporter.sendMail({
            from: 'ashithkumargowda.aiet@gmail.com',
            to: email,
            subject: 'Email Verification',
            html: `<h3>Hello ${name},</h3><p>Please verify your email by clicking on the link below:</p>
                   <a href="${verificationLink}">Verify Email</a>`
        })

        res.json({
            message: "Signup successful! Please check your email to verify your account.",
            token: token
        })

    } catch (error) {
        if (error.name === 'ValidationError') {
           
            for (let field in error.errors) {
                const err = error.errors[field]
                if (err.kind === 'enum') {
                    res.json({ message: `Invalid year: ${err.value}` })
                    return
                }
            }
        } else {
           
            console.error('Error during signup:', error)
            res.status(500).json({ message: "An error occurred during signup" })
        }
    }
})


studentRouter.get("/verify-email", async (req, res) => {
    const { token, email } = req.query
    try {
        const student = await Student.findOne({ email: email, verificationToken: token })
        const id = student._id
        if (!student) {
            return res.status(400).json({ message: "Invalid token or email" ,verified:false})
        }
        student.verified = true
        await student.save()
        await Student.updateOne(
            { _id: id },
            { $unset: { verificationToken: "" } }
          )
          
        res.json({ message: "Email verified successfully" ,verified:true})
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Server error" })
    }
})

studentRouter.get("/me",verifyJwt,(req,res)=>{
         const email = req.email
         const user = Student.findOne({email:email})
        if(user){
            res.json({message:"user found"})
        }
})

studentRouter.get("/login",zodLoginVerify,async(req,res)=>{
            const {email,password} = req.body
            const user = await Student.findOne({email:email})

            if(user){
                bcrypt.compare(password,user.password,(err,sucess)=>{
                    if(err){
                        res.json({message:"invalid credentials"})
                    }
                    else{
                        const token = jwt.sign({email:email},SECRET)
                        res.json({valid:sucess,token,message:"Logged in Sucessfully"})
                    }
                })
            }
            else{
                res.json({message:"user not found please register"})
            }
})

studentRouter.post("/forgotPassword",async(req,res)=>{
        const {email} = req.body
        const user = await Student.findOne({email:email})
      
        if(!user){
            return res.status(400).json({message:"user not found pls enter corect email.",valid:false})
        }

        const resetToken = crypto.randomBytes(32).toString('hex')
        user.resetToken = resetToken
        await user.save()

        const resetLink = `${process.env.FORGOT_PASSWORD_DOMIAN}?token=${resetToken}`

        const mailOptions = {
            from: 'ashithkumargowda.aiet@gmail.com',
            to: user.email,
            subject: 'Password Reset',
            html: `<h3>Hello,</h3><p>Please click the link below to reset your password:</p>
                   <a href="${resetLink}">Reset Password</a>`,
          }

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              return res.status(500).json('Error sending email.');
            }
            res.send('Password reset link sent to your email.');
          })

})

studentRouter.get('/reset-password', async (req, res) => {
    const { token } = req.query;
  
    const user = await Student.findOne({ resetToken: token})
    const id = user._id
    if (!user) {
      return res.status(400).send('Invalid or expired token.');
    }

     const update = await Student.updateOne(
        { _id: id },
        { $unset: { resetToken: "" } }
      )

      if(update){
        res.json({message:"Reset Password",valid:true})
      }
      else{
        res.json({message:"Cannot reset-password,Pls try again later!",valid:false})
      }
  })

  studentRouter.post("/updatePassword",async(req,res)=>{
    const requireBody = z.object({
        email:z.string().email(),
        password: z.string().max(20),
    })

    const safeParse = requireBody.safeParse(req.body)

    if (!safeParse.success) {
        res.status(411).json({
            message: "Incorrect format",
            error: safeParse.error.issues[0].message 
        })
        return
    }

    const email = safeParse.data.email
    const password = safeParse.data.password
    const hashPassword = await bcrypt.hash(password,5)

    const user = Student.findOne({email:email})
    if(!user){
        res.json({message:"Enter coreect email!",valid:false})
    }
   try {
        user.password = hashPassword
        await user.save()
        res.json({message:"password changed sucessfully",valid:true})
    
     } catch (error) {
        res.json({message:"password change failed",vaild:true})
      }
  
  })

module.exports={
    studentRouter:studentRouter
}