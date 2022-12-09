const ImageUrlBuilder = require("@sanity/image-url");
const client = require("./client");

function urlForThumbnail(source) {
  return ImageUrlBuilder(client).image(source).width(300).url();
}
function urlFor(source) {
  return ImageUrlBuilder(client).image(source).width(580).url();
}
module.exports = { urlForThumbnail, urlFor };
