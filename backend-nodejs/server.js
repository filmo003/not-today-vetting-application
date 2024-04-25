// server.js
const express = require('express');
const session = require('express-session');
const app = express();
const port = 3000; // Choose any available port
const helper = require('./helperFunctions')

app.use(session({secret: 'sample secret', resave: true, saveUninitialized: true}))

var meetings = [];

app.get('/', (req, res) => {
    res.send('\nHello from the not-today backend!');
});

app.post("/newMeeting", (req, res) => {
    const { title, classLevel } = req.query;
    const id = Math.floor(Math.random() * 10); //meeting ID
    console.log(`Creating meeting: ${id}`);
    const newMeeting = {meetingID:`${id}`, meetingTitle:title, attendees: [], meetingClassification:classLevel};
    meetings.push(newMeeting);
    res.status(201).json(newMeeting);
});

app.post('/checkAttendee', async (req, res) => {
    try {
        // Check the attendee's EDIPI against the Jira Asset
        const { edipi, meetingID } = req.query;
        console.log(`User EDIPI: ${edipi}`);
        if (!edipi) {
            return res.status(400).json({ error: "Missing parameter" });
        }
        for (const meeting of meetings) {
            if (meeting.meetingID === meetingID) {
                console.log("Meeting match found");
                const result = await helper.checkClearance(edipi, meeting, res);
                console.log(result);
                if (result) {
                    console.log(`Adding user ${edipi} to meeting ID: ${meetingID}`);
                    meeting.attendees.push(edipi);
                    return
                }
                else {
                    console.log("Deny statement sent in response");
                    return
                }
            }
        }
        return res.status(400).json({ error: "Meeting does not exist" });
    } catch (error) {
        console.error("Error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});


app.get('/meetings', (req, res) => {
    console.log(meetings);
    res.send(meetings);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
