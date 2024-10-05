const jwt = require("jsonwebtoken")
require("dotenv").config()
const SECRET = process.env.JWT_SECRET_STUDENT

const verifyJwt = (req,res,next)=>{
    const {token} = req.headers
    if(token){
        jwt.verify(token,SECRET,(err,decoded)=>{
            if(err){
                return res.sendStatus(403);
            }
            req.email=decoded.email
            next()
        })
    }
    else{
        res.sendStatus(401).json({message:"pls login"})
    }
}

module.exports={
    verifyJwt:verifyJwt
}