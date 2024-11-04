const crypto = require('crypto');


const verificationToken = crypto.randomBytes(32)
console.log(verificationToken)