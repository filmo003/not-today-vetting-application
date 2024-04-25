const fs = require('fs');
const axios = require('axios').default;

const JIRA_API_TOKEN = fs.readFileSync('/run/secrets/JIRA_API_TOKEN', 'utf8').trim();
const objectSchemaId = 13; //Schema ID for the asset in Jira
const JIRA_BASE_URL = process.env.JIRA_BASE_URL; //defined in docker-compose

module.exports = {
  checkClearance: async function (edipi, meetingObj, res){
    return new Promise((resolve, reject) => {
      let config = {
        method: 'get',
        maxBodyLength: Infinity,
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
            return res.send("No entry found. Deny");
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
      });
    })
  }
}