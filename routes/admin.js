const {Router} = require("express")
const adminRouter = Router()
const nodemailer = require('nodemailer')
const crypto = require('crypto')
const {PrismaClient} = require("@prisma/client")
const prisma = new PrismaClient()
const bcrypt = require("bcrypt")
const {z} = require("zod")
const jwt = require("jsonwebtoken")
const {zodLoginVerify} = require("../middlewares/zodlogin")
const { verifyJwtAdmin } = require("../middlewares/authJwtAdmin")
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
                        const token = jwt.sign({email:email,name:user.name},SECRET)
                        res.json({valid:true,token,message:"Logged in Sucessfully"})
                    }
                })
            }
            else{
                res.json({message:"Admin not found please register"})
            }
})

adminRouter.get("/me",async(req,res)=>{
    const email = req.email
    const user =await prisma.admin.findFirst({where:{email:email}})
   if(user){
       res.json({message:"user found",user:user})
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
            res.json({message:'Password reset link sent to your email.'})
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

 
adminRouter.post("/updatePassword",verifyJwtAdmin,async(req,res)=>{
    
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
    
                const hashPassword = await bcrypt.hash(password,5)
      
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

adminRouter.post("/block",async(req,res)=>{
    const token = req.body.token
    const usn = req.body.usn

    const adminFind = jwt.verify(token,SECRET)

    if(!adminFind){
        return res.json({message:"not authorized to block"})
    }

 
    const user = await prisma.student.findFirst({where:{usn:usn}})
    if(!user){
     return res.json({message:"pls enter valid usn"})
    }
    await prisma.student.update({
        where:{
            email:user.email
        }
        ,data:{
            blocked:true,
            blockedBy: adminFind.name
        }
    })
    res.json({message:`blocked ${user.name}`})
})

adminRouter.post("/removeblock",async(req,res)=>{
    const token = req.body.token
    const usn = req.body.usn

    const adminFind = jwt.verify(token,SECRET)

    if(!adminFind){
        return res.json({message:"not authorized to block"})
    }

 
    const user = await prisma.student.findFirst({where:{usn:usn}})
    if(!user){
     return res.json({message:"pls enter valid usn"})
    }
    await prisma.student.update({
        where:{
            email:user.email
        }
        ,data:{
            blocked:false,
            blockedBy: null
        }
    })
    res.json({message:`blocked ${user.name}`})
})

adminRouter.post("/allow",async(req,res)=>{
    const token = req.body.token
    const adminFind = jwt.verify(token,SECRET)

    if(!adminFind){
        return res.json({message:"not authorized to allow"})
    }

   const allowed =  await prisma.student.updateMany({
        where:{
            blocked:false
        }
        ,data:{
            outing:true,
            allowedBy: adminFind.name
        }
    })

        if(allowed){
            res.json({message:"allowed for outing"})
        }
        else{
            res.json({message:"unable to allow outing"})
        }
})

adminRouter.post("/stopAllow",async(req,res)=>{
    const token = req.body.token
    const adminFind = jwt.verify(token,SECRET)

    if(!adminFind){
        return res.json({message:"not authorized to notallow"})
    }

   const allowed =  await prisma.student.updateMany({
        where:{
            outing:true
        }
        ,data:{
            outing:false
        }
    })
        if(allowed){
            res.json({message:"Stopped request forouting"})
        }
        else{
            res.json({message:"unable to stop request for outing"})
        }
})

module.exports={
    adminRouter:adminRouter
}