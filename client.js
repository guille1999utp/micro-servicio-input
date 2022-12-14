const sanityClient = require("@sanity/client");
const config = require("./config");
console.log(config);
const client = sanityClient({
  projectId: config.projectId,
  dataset: config.dataset,
  useCdn: true,
  apiVersion: "2022-06-22",
});
module.exports = client;
