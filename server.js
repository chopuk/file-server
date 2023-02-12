// The purpose of this server is to provide
// images for my React Native or Ionic developments
// and to allow uploads of images, too.
// Also it will allow uploads of any type of file and will send an email with that file as an attachment

const express = require('express')
const path = require('path')
var cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const moment = require('moment')
const EmailTemplates = require('swig-email-templates')
const nodemailer = require('nodemailer')
const dotenv = require('dotenv')
dotenv.config()
// the following required for email templates in controller checkout.js
global.appRoot = path.resolve(__dirname)

const app = express()
//app.use(cors())
app.use((req, res, next) => {

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if ( req.method === 'OPTIONS') {
      return res.sendStatus(200)
  }
  next()

})

app.use(express.json({ limit: '15MB' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public'))) 

// configure multer...
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
})
const upload = multer({ storage: storage })

// endpoints...
app.get('/', (req,res) => {
    res.send("Welcome to Big Chopper's File Server...")
})

// upload base64 encoded image
app.post('/uploadbase64', (req,res) => {
  fs.writeFile('./public/uploads/' + req.body.filename, req.body.imgsource, 'base64', (err) => {
		if (err) throw err
	})
  res.json({filename: req.body.filename})
})

// upload image using formData and multer
app.post('/uploadimage', upload.single('instaImage'), (req,res) => {
  res.json({filename: req.file.originalname})
})

// send email with attached csv data ( used by blood pressure buddy )
app.post('/sendcsv', (req,res) => {
  // write the csv file...
  fs.writeFile('./public/csvfiles/' + 'export.csv', req.body.csvData, 'utf8', (err) => {
		if (err) throw err
      // Send confirmation email
      let readings = []
      readings = req.body.readings
      readings.forEach(reading => {
        reading.date = moment(reading.readingDate).format('Do MMMM YYYY')
      })

      // initialise smtp
      var smtpTransport = nodemailer.createTransport({
          host: "smtp.mailgun.org",
          auth: {
              user: process.env.MAILGUN_USER,
              pass: process.env.MAILGUN_PASSWORD
          }
      })

      var templates = new EmailTemplates({root: path.join(global.appRoot,'emailTemplates')})
      var context = {
                      items: readings
      }

      templates.render('emailCSV.html', context, function(err, html, text) {

          const customerName = req.body.customerName
          const email = req.body.email
      
          // setup email data
          var mailOptions = {
              from: "Blood Pressure Buddy<bpb@bpd.com>", 
              to: customerName + " " + "<" + email + ">", 
              subject: "Requested Results", 
              html: html,
              attachments: [
                {   
                    filename: 'export.csv',
                    path: 'public/csvfiles/export.csv'
                }
              ]
          }

          // send email
          smtpTransport.sendMail(mailOptions, function(error, info){
              if(error){
                  console.log(error)
              }else{
                  console.log("Message sent: " + info.messageId);
              }  
              smtpTransport.close()
          })

      })
      res.json({message: 'Email sent successfully'})
    })
})

//start server...
dotenv.config()
const PORT = process.env.PORT || 4000

app.listen(PORT, () => console.log(`Chop's File Server running on PORT ${PORT}`) )