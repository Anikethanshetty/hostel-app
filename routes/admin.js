const {Router} = require("express")
const adminRouter = Router()
const nodemailer = require('nodemailer');
const crypto = require('crypto')
const {PrismaClient} = require("@prisma/client")
const prisma = new PrismaClient()
const bcrypt = require("bcrypt")
const {z} = require("zod")
const jwt = require("jsonwebtoken")
const {zodLoginVerify} = require("../middlewares/zodlogin")
const {verifyJwt} = require("../middlewares/authJwt");
require("dotenv").config()
const SECRET = process.env.JWT_SECRET_ADMIN

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: 'ashithkumargowda.aiet@gmail.com', 
        pass: 'momz dgnz diha lmpy '   
    }
})

adminRouter.get("/login",zodLoginVerify,async(req,res)=>{
            const {email,password} = req.body
            const user = await prisma.admin.findFirst({where:{email:email}})

            if(user){
                bcrypt.compare(password,user.password,(err,sucess)=>{
                    if(err){
                        res.json({message:"invalid credentials"})
                    }
                    else{
                        const token = jwt.sign({email:email},SECRET)
                        res.json({valid:true,token,message:"Logged in Sucessfully"})
                    }
                })
            }
            else{
                res.json({message:"Admin not found please register"})
            }
})

adminRouter.get("/me",verifyJwt,(req,res)=>{
    const email = req.email
    const user = prisma.admin.findFirst({where:{email:email}})
   if(user){
       res.json({message:"user found"})
   }
})

adminRouter.post("/forgotPassword",async(req,res)=>{
    try {
        const {email} = req.body
        const user = await prisma.admin.findFirst({where:{email:email}})
      
        if(!user){
            return res.status(400).json({message:"user not found pls enter corect email.",valid:false})
        }

        const resetToken = crypto.randomBytes(32).toString('hex')
        await prisma.admin.update({
            where:{
                id:user.id
            },
            data:{
                resetToken:resetToken
            }
        })

        const resetLink = `${process.env.FORGOT_PASSWORD_DOMIAN_ADMIN}?token=${resetToken}`

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
            res.json({message:'Password reset link sent to your email.'});
          })
    } catch (error) {
        res.json({message:"server error pls try agin later"})
    }
        

})

adminRouter.get('/reset-password', async (req, res) => {
    const { token } = req.query;
  
    const user = await prisma.admin.findFirst({where:{resetToken: token}})
    if (!user) {
      return res.status(400).send('Invalid or expired token.');
    }

    if (!user) {
        return res.status(400).send('Invalid token.');
      }else{
      res.json({message:"Reset Password",valid:true})
      }    
    })

 
  adminRouter.post("/updatePassword",verifyJwt,async(req,res)=>{
    
   try {
        const useremail = req.email
        if(useremail){
            
            const user = await prisma.admin.findFirst({
                where:{
                    email:useremail
                }
            })
            const resetToken = user.resetToken

            if(resetToken){

            const requireBody = z.object({
                password:z.string().max(20)
            })

            const safeParse = requireBody.safeParse(req.body)

            if(!safeParse.success){
                return res.json({message:"pls enter a valid password"})
            }
            
                const password = req.body.password
                console.log(password)
                const hashPassword = await bcrypt.hash(password,5)
                    console.log(hashPassword)
                    await prisma.admin.update({
                        where:{
                            id:user.id
                        },
                        data:{
                            password:hashPassword,
                            resetToken:null
                        }
                    })
                    res.json({message:"password changed sucessfully",valid:true})
            }
            else{
                res.json({message:"cannot updatePassword "})
            }
    
        }
        else{
            res.json({message:"cannot find user"})
        }

     } catch (error) {
        res.json({message:"password change failed",valid:false})
      }
  })
module.exports={
    adminRouter:adminRouter
}