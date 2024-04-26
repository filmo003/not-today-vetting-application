const fs = require('fs');
const axios = require('axios').default;

const JIRA_API_TOKEN = fs.readFileSync('/run/secrets/JIRA_API_TOKEN', 'utf8').trim();
const objectSchemaId = 13; //Schema ID for the asset in Jira
const meetingObjectTypeID = 208; // Jira Object ID for Meeting Objects
const JIRA_BASE_URL = process.env.JIRA_BASE_URL; //defined in docker-compose

module.exports = {
  checkClearance: function (edipi, meetingID, res){
    return new Promise((resolve, reject) => {
      let config = {
        method: 'get',
        url: `${JIRA_BASE_URL}/rest/assets/1.0/aql/objects?objectSchemaId=${objectSchemaId}&qlQuery=EDIPI LIKE "${edipi}"`,
        headers: {  
            "Authorization" : `Bearer ${JIRA_API_TOKEN}`
        }
      };
      axios.request(config) // see if the edipi exists in the user DB
      .then((response) => {
        const responseString = JSON.stringify(response.data);
        personObject = response.data.objectEntries[0];
        if (!personObject){
          console.log("No entry found")
          return res.status(403).json({ error: "No entry found. Deny" });
        }
        else {
          // check person's access
          personName = personObject.label;
          console.log(`Name = ${personName}`);
          // iterate through attributes to find "access" attribute
          console.log("Checking classification reqs");
          var userAccessLevel = "";
          for (const attribute of personObject.attributes) {
            if (attribute.objectTypeAttributeId == 1943) { //id of access attribute
              userAccessLevel = attribute.objectAttributeValues[0].value
              console.log(`User Clearance is: ${userAccessLevel}`);
            }
          }
          if (userAccessLevel == ""){
            console.log("user missing access attribute");
            return res.status(400).json({ error: "User does not have access attribute" })
          }
          // ~~~~~ get meeting object ID from Jira based on meetingID ~~~~
          let getMeetingConfig = {
            method: 'get',
            url: `${JIRA_BASE_URL}/rest/assets/latest/aql/objects?objectSchemaId=${objectSchemaId}&qlQuery=meetingID LIKE "${meetingID}"`,
            headers: { 
              "Content-Type" : "application/json", 
              "Authorization" : `Bearer ${JIRA_API_TOKEN}`
            },
          };
          axios.request(getMeetingConfig)
          .then((meetingsResponse) => {
            //console.log(`meeting response is: ${JSON.stringify(meetingsResponse)}`);
            const meeting = meetingsResponse.data.objectEntries[0];
            if(!meeting){ //if no meeting exists
              return res.status(403).json({ error: `No meeting found with ID:${meetingID}`})
            }
            console.log(`got meetings response -- looking for meeting based on meetingID`);
            var addUser = false;
            var attendees = "";
            //console.log(`Meeting: ${meeting}`);
            for (const attribute of meeting.attributes){
              console.log(`checking attribute: ${attribute.objectAttributeValues[0].value}`);
              if (attribute.objectTypeAttributeId == 1951 && attribute.objectAttributeValues[0].value == meetingID){ // check if we're on the meetingID attribute AND that the meetingID sent matches
                console.log("found meeting, checking clearance");
                for (const attribute2 of meeting.attributes){
                  if (attribute2.objectTypeAttributeId == 1952 && !(userAccessLevel.includes(attribute2.objectAttributeValues[0].value))){ // check if we're on the access attribute & req access is NOT in user's access level
                    console.log("User access does not meet meeting access level");
                    console.log(`Meeting needs at least: ${attribute2.objectAttributeValues[0].value}`);
                    console.log(`User has: ${userAccessLevel}`);
                    return res.status(403).json({ error: "Access denied" });
                  }
                }
                addUser = true; //found the user and the meeting, add them to attributes
              }
              if (attribute.objectTypeAttributeId == 1949){ // attribute of attendees
                attendees = attribute.objectAttributeValues[0].value;
                console.log(`Attendees before: ${attribute.objectAttributeValues[0].value}`);
              }
            }
            if (addUser){
              console.log("Correct clearance!");
              console.log(`Adding user to meetingID:${meetingID}`)
              const newAttendees = attendees + edipi + '\n'; // concat new edipi to the list
              console.log(`New Attendance list is: ${newAttendees}`);
              let data = JSON.stringify({
                "objectTypeId": 208, //identifies it as a meeting object
                "attributes": [
                  {
                    "objectTypeAttributeId": 1949,
                    "objectAttributeValues": [
                      {
                        "value": `${newAttendees}`
                      }
                    ]
                  }
                ]
              });
              let updateAttendeeConfig = {
                method: 'put',
                url: `${JIRA_BASE_URL}/rest/assets/latest/object/${meeting.id}`,
                headers: { 
                  "Content-Type" : "application/json", 
                  "Authorization" : `Bearer ${JIRA_API_TOKEN}`
                },
                data : data
              };
              axios.request(updateAttendeeConfig) // PUTS new attendance data into Jira
              .then((updateResponse) => {
                //console.log(JSON.stringify(response.data));
                //return res.send(JSON.stringify(response.data))
                return res.status(200).json({ message: "Correct Clearance, ADMIT" });
              })
              .catch((error) => {
                console.log(error);
                return res.status(500).json({ error: "server error during update attendee"})
              });
            }
            else{
              console.log(`No meeting found with ID:${meetingID}`);
              return res.status(403).json({ error: `User is missing access attribute`})
            }
          })
          .catch((error) => {
            console.log(error);
            return res.status(500).json({ error: "server error around getting meetings response" })
          });
        }
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" })
      });
    })
  },



  createMeeting: function (meetingID, title, classification, res){
    // POST Jira API to create new meeting object
    return new Promise((resolve, reject) => {
      console.log(`Creating new meeting with ID:${meetingID} in Jira`);
      let data = JSON.stringify({
        "objectTypeId": 208, //identifies it as a meeting object
        "attributes": [
          {
            "objectTypeAttributeId": 1946, // meeting title
            "objectAttributeValues": [
              {
                "value": `${title}`
              }
            ]
          },
          {
            "objectTypeAttributeId": 1951, // meeting ID
            "objectAttributeValues": [
              {
                "value": `${meetingID}`
              }
            ]
          },
          {
            "objectTypeAttributeId": 1952, // classification
            "objectAttributeValues": [
              {
                "value": `${classification}`
              }
            ]
          },
          {
            "objectTypeAttributeId": 1949, // list of attendees
            "objectAttributeValues": [
              {
                "value": ""
              }
            ]
          },
          {
            "objectTypeAttributeId": 1950, // list of rejected attendees
            "objectAttributeValues": [
              {
                "value": ""
              }
            ]
          }
        ]
      });
      
      let config = {
        method: 'post',
        url: `${JIRA_BASE_URL}/rest/assets/latest/object/create`,
        headers: { 
          "Content-Type" : "application/json", 
          "Authorization" : `Bearer ${JIRA_API_TOKEN}`
        },
        data : data
      };
      
      axios.request(config)
      .then((response) => {
        console.log(JSON.stringify(response.data));
        return res.send(JSON.stringify(response.data))
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" })
      });
    })
  },


  getMeetingWithID: function (meetingID, res){
    return new Promise((resolve, reject) => {
      let config = {
        method: 'get',
        url: `${JIRA_BASE_URL}/rest/assets/latest/aql/objects?objectSchemaId=${objectSchemaId}&qlQuery=meetingID LIKE "${meetingID}"`,
        headers: {  
            "Authorization" : `Bearer ${JIRA_API_TOKEN}`
        }
      };
      axios.request(config)
      .then((response) => {
        const responseString = JSON.stringify(response.data);
        console.log(responseString);
        return res.send(responseString)
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
      })
    })
  },

  getMeetings: function (res){
    return new Promise((resolve, reject) => {
      console.log("Getting meetings");
      let config = {
        method: 'get',
        url: `${JIRA_BASE_URL}/rest/assets/latest/aql/objects?qlQuery=ObjectTypeID LIKE "${meetingObjectTypeID}"`,
        headers: {
            "Authorization" : `Bearer ${JIRA_API_TOKEN}`
        }
      };
      axios.request(config)
      .then((response) => {
        const responseString = JSON.stringify(response.data);
        //console.log(responseString);
        return res.send(responseString)
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
      })
    })
  }
}