const mongoose = require('mongoose');
const recipientSchema = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    age:{
        type:Number,
        required:true
    },
    gender:{
        type:String,
        required:true
    },
    bloodGroupNeeded:{
        type:String,
        required:true
    },
    unitsNeeded:{
        type:Number,
        // required:true
        default:1
    },
    contact:{
        type:String,
        required:true
    },
    hospital:{
        type:String,
        required:true
    },
    requestedAt:{
        type:Date,
        default:Date.now
    },
    status:{
        type:String,
        enum:['pending','approved','rejected'],
        default:'pending'
    }
})
module.exports = mongoose.model('Recipient',recipientSchema);