const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
dotenv.config();

// open connection to sqlite db
const sqlite3 = require('sqlite3').verbose()
let db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to local sqlite database');
});

// create contactform table to insert form submissions to
db.serialize(function () {
    db.run(`CREATE TABLE contactform (
        contactformid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name VARCHAR(100), 
        subject VARCHAR(100),
        email VARCHAR(254),
        message VARCHAR(4000)
        )`
    );
    console.log('Created contactform table');
})

/*
// Populate db with test data
db.serialize(function () {
    // prep sql statement to insert to db
    let insertSql = `INSERT INTO contactform('name', 'email', 'subject', 'message')
                    VALUES(?, ?, ?, ?)`
    // prep submitted values to insert into db
    let name = "megan"
    let email = "mvamolloy@gmail.com"
    let subject = "Canal & River Trust"
    let message = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
    db.run(insertSql, [name, email, subject, message], function(err) {
        if (err) {
            return console.log(err.message);
        }
        console.log("Row inserted into database: ");
    });
    // read and log test row from db
    let querySql = `SELECT * FROM contactform`
    db.all(querySql, [], (err, row) => {
        if (err) {
            throw err;
        }
        console.log(row);
    });
});
*/

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: process.env.email,
        pass: process.env.password,
    },
});

const app = express();

const buildPath = path.join(__dirname, '..', 'build');
app.use(express.json());
app.use(express.static(buildPath));

app.post('/send', (req, res) => {

    // prep submitted form values to insert into db/mailOptions
    let reqName = req.body.name;
    let reqEmail = req.body.email;
    let reqSubject = req.body.subject;
    let reqMessage = req.body.message;

    db.serialize(function () {
        
        // prep sql statement to insert to db
        let insertSql = `INSERT INTO contactform('name', 'email', 'subject', 'message')
                        VALUES(?, ?, ?, ?)`
        
        // insert prepared values into db
        db.run(insertSql, [reqName, reqEmail, reqSubject, reqMessage], function(err) {
            if (err) {
                return console.log(err.message);
            }
            console.log(`Row inserted into database:`);
        });

        // prep sql query to select inserted row
        let querySql = `SELECT * FROM contactform
                    ORDER BY contactformid
                    DESC LIMIT 1`
        
        // select inserted row from db
        db.all(querySql, [], (err, row) => {
            if (err) {
                throw err;
            }
            console.log(row);
        });
    });

    const mailOptions = {
        from: reqEmail,
        to: process.env.email,
        subject: reqSubject,
        html: `
      <p>The Trust has a new contact us request:</p>
      <ul>
        <li>Name: ${reqName}</li>
        <li>Email: ${reqEmail}</li>
        <li>Subject: ${reqSubject}</li>
        <li>Message: ${reqMessage}</li>
      </ul>
      `,
    };

    try {
        transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                res.status(500).send({
                    success: false,
                    message: 'Something went wrong. Please try again later.',
                });
            } else {
                res.send({
                    success: true,
                    message:
                        'Thanks for contacting us. We will get back to you shortly.',
                });
            }
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: 'Something went wrong. Try again later',
        });
    }
});

app.listen(3030, () => {
    console.log('Server start at: http://localhost:3030/');
});
