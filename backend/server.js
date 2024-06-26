// server.js
const express = require('express');
//const session = require('express-session');
const app = express();
const port = 3000; // Choose any available port
const helper = require('./helperFunctions')

//app.use(session({secret: 'sample secret', resave: true, saveUninitialized: true}))

var meetings = [];

app.get('/', (req, res) => {
    res.send('\nHello from the not-today backend!');
});

app.post("/newMeeting", (req, res) => {
    // takes in title & classificaiton params and creates new meeting
    // returns unique meeting ID
    try{
        const { title, classLevel } = req.query;
        const id = Math.floor(Math.random() * 10); //meeting ID
        console.log(`Creating meeting: ${id}`);
        //const newMeeting = {meetingID:`${id}`, meetingTitle:title, attendees: [], meetingClassification:classLevel};
        helper.createMeeting(id, title, classLevel, res);
        //meetings.push(newMeeting);
        //res.status(201).json(newMeeting);
    }catch (error) {
        console.error("Error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.post('/checkAttendee', async (req, res) => {
    // takes in edipi & meetingID params and checks if an attendee meets the access
    // reqs for the meeting
    try {
        // Check the attendee's EDIPI against the Jira Asset
        const { edipi, meetingID } = req.query;
        console.log(`User EDIPI: ${edipi}`);
        if (!edipi) {
            return res.status(400).json({ error: "Missing parameter" });
        }
        helper.checkClearance(edipi, meetingID, res);
    } catch (error) {
        console.error("Error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.get('/meetingWithID', (req, res) => {
    const { meetingID } = req.query;
    helper.getMeetingWithID(res);
});

app.get('/meetings', (req, res) => {
    // GETs all meetings
    //console.log(meetings);
    //res.send(meetings);
    helper.getMeetings(res);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
