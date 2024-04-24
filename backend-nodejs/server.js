// server.js
const express = require('express');
const session = require('express-session');
const app = express();
const port = 3000; // Choose any available port
const helper = require('./helperFunctions')

app.use(session({secret: 'sample secret', resave: true, saveUninitialized: true}))

app.get('/', (req, res) => {
    res.send('\nHello from the not-today backend!');
});

app.get("/login", (req, res) => {

});

app.get('/checkAttendee', (req, res) => {
    // check the attendee's edipi against the Jira Asset
    const { edipi, classification } = req.query;
    console.log(`User EDIPI: ${edipi}`);
    console.log(`Session classifiaction: ${classification}`);
    if (!edipi || !classification) {
        return res.status(400).json({ error: "missing parameter"})
    }
    helper.checkClearance(classification, edipi, res);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
