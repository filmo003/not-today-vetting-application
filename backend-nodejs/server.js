// server.js
const express = require('express');
const app = express();
const port = 3000; // Choose any available port
const axios = require('axios').default;
const objectSchemaId = 13 //Schema ID for the asset in Jira
const fs = require('fs');
const JIRA_API_TOKEN = fs.readFileSync('/run/secrets/JIRA_API_TOKEN', 'utf8').trim();
const JIRA_BASE_URL = process.env.JIRA_BASE_URL; //defined in docker-compose

//import jiraClient from './jiraClient';

app.get('/', (req, res) => {
    res.send('\nHello from the not-today backend!');
});

app.get('/checkAttendeeSecret', (req, res) => {
    // check the attendee's edipi against the Jira Asset
    const { edipi } = req.query;
    console.log(`User EDIPI: ${edipi}`);
    if (!edipi) {
        return res.status(400).json({ error: "need edipi"})
    }
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://jira.truststack.us/rest/assets/1.0/aql/objects?objectSchemaId=${objectSchemaId}&qlQuery=EDIPI LIKE "${edipi}"`,
        headers: {  
            "Authorization" : `Bearer ${JIRA_API_TOKEN}`
        }
    };
    
    axios.request(config)
    .then((response) => {
        const responseString = JSON.stringify(response.data);
        personObject = response.data.objectEntries[0];
        if (!personObject){
            console.log("No entry found")
            res.send("No entry found. Deny");
            return
        }
        // check person's access is at least secret
        personName = personObject.label;
        console.log(`Name = ${personName}`);
        // iterate through attributes to find "access" attribute
        for (const attribute of personObject.attributes) {
            if (attribute.id == 414540) { //id of access attribute
                if (attribute.objectAttributeValues[0].value.includes("Secret")) {
                    console.log("Correct clearance!");
                    res.send('\nCorrect Clearance! Admit');
                    return
                }
                res.send('\nIncorrect Clearance, Deny');
                return
            }
        }
        res.send('something went wrong');
    })
    .catch((error) => {
        console.log(error);
    });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
