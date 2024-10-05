const mongoose = require('mongoose');
const { boolean } = require('zod');
const Schema = mongoose.Schema

const studentSchema = new Schema({
    email: {
        type: String,
        required: true, 
        unique: true
    },
    password: {
        type: String,
        required: true 
    },
    name: {
        type: String
    },
    year: {
        type: String,
        enum:["1","2","3","4"]
    },
    usn: {
        type: String, 
        default: "1st year" 
    },
    verified:{
        type:String,
        enum:[true,false]
    },
    verificationToken:{type:String},
    resetToken:{type:String}
})

const Student = mongoose.model('Student', studentSchema);

module.exports={
    Student:Student
}