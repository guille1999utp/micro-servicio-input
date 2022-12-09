const Nodemailer = require("nodemailer");
let transporter = Nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.CORREO_SECRET,
    pass: process.env.GOOGLE_SECRET,
  },
  tls:{
    rejectUnauthorized:false
  }
});


transporter.verify().then(()=>{
  console.log("conectado Nodemailer para correo")
}).catch((err)=>{
  console.log(err);
})
module.exports = {transporter}