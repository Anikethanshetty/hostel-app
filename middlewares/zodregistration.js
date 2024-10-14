const {z}=require("zod")

const requireBody = z.object({
    email: z.string().email(),
    password: z.string().max(20),
    name: z.string(),
    year: z.string(),
    usn: z.string().optional(),
    room:z.string().min(3).max(3),
    block:z.string()
})

const zodVerify = (req,res,next)=>{
    const safeParse = requireBody.safeParse(req.body)
    
    if (!safeParse.success) {
        res.status(411).json({
            message: "Incorrect format",
            error: safeParse.error.issues[0].message 
        })
        return
    }
    else{
        
        req.body=safeParse.data
        next()
    }
}

module.exports={
    zodVerify:zodVerify
}