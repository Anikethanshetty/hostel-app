const {z}=require("zod")

const requireBody = z.object({
    email: z.string().email(),
    password: z.string().max(20),
})

const zodLoginVerify = (req,res,next)=>{
    const safeParse = requireBody.safeParse(req.body)
    
    if (!safeParse.success) {
        res.status(411).json({
            message: "Incorrect format of email oe password",
            error: safeParse.error.issues[0].message 
        })
        return
    }
    else{
        req.body= safeParse.data
        next()
    }
}

module.exports={
    zodLoginVerify:zodLoginVerify
}