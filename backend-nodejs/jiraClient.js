// jiraClient.js
const axios = require('axios').default;

const jiraClient = (baseUrl, email, token) => {
  const instance = axios.create({
    baseURL: baseUrl,
    headers: {
      'Authorization': `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  return {
    getIssue: async (issueIdOrKey) => {
      try {
        const response = await instance.get(`/rest/api/3/issue/${issueIdOrKey}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching issue:', error);
        throw error;
      }
    }
    // Add more methods as needed
  };
};

module.exports = jiraClient;
