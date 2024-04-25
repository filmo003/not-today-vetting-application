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
      axios.request(config)
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
          for (const attribute of personObject.attributes) {
            if (attribute.id == 414540) { //id of access attribute
              if (attribute.objectAttributeValues[0].value.includes(meetingObj.meetingClassification)) {
                console.log("Correct clearance!");
                console.log(`Adding user to meetingID:${meetingID}`)

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
                  console.log("got meetings response -- looking for meeting based on meetingID");
                  const meetings = meetingsResponse.objectEntries;
                  for (const meeting of meetings){
                    console.log(`Meeting: ${meeting}`);
                    var addUser = false;
                    var attendees = "";
                    for (const attribute of meeting.attributes){
                      if (attribute.objectTypeAttributeId == 1951 && attribute.id.objectAttributeValues[0].value == meetingID){ // attribute ID of meetingID
                        console.log("found meeting, adding user to attendees");
                        addUser = true; //found the user and the meeting, add them to attributes
                      }
                      if (attribute.objectTypeAttributeId == 1949){ // attribute of attendees
                        attendees = attribute.objectAttributeValues[0].value;
                        console.log(`Attendees before: ${attribute.objectAttributeValues[0].value}`);
                      }
                      if (addUser){
                        const newAttendees = attendees + edipi + '\n'; // concat new edipi to the list
                        let data = JSON.stringify({
                          "objectTypeId": 208, //identifies it as a meeting object
                          "attributes": [
                            {
                              "objectTypeAttributeId": 1949,
                              "objectAttributeValues": [
                                {
                                  "value": `${attendees}`
                                }
                              ]
                            }
                          ]
                        });
                        let updateAttendeeConfig = {
                          method: 'post',
                          url: `${JIRA_BASE_URL}/rest/assets/latest/object/${meeting.id}`,
                          headers: { 
                            "Content-Type" : "application/json", 
                            "Authorization" : `Bearer ${JIRA_API_TOKEN}`
                          },
                          data : data
                        };
                        axios.request(updateAttendeeConfig)
                        .then(updateResponse) =>{

                        }

                        //console.log(JSON.stringify(response.data));
                        return res.send(JSON.stringify(response.data))
                })
                .catch((error) => {
                  console.log(error);
                  return res.status(500).json({ error: "Internal server error" })
                });
                }
                        
                .catch((error) => {
                  console.log(error);
                  return res.status(500).json({ error: "Internal server error" })
                });

                return res.status(200).json({ message: "Correct Clearance, ADMIT" });
              }
              else {
                console.log("Incorrect clearance");
                return res.status(403).json({ error: "Access denied" });
              }
            }
          }
          return res.status(400).json({ error: "User does not have access attribute" });
        }
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
      })
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
        console.log(responseString);
        return res.send(responseString)
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
      })
    })
  }
}