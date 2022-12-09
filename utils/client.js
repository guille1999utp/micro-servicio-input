const SanityClient = require("@sanity/client");
const { config } = require("./config");

const client = SanityClient({
  projectId: config.projectId,
  dataset: config.dataset,
  useCdn: true,
  apiVersion: "2022-06-22",
});
module.exports = {client};
