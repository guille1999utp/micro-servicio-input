const jwt = require("jsonwebtoken");

const signToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const isAuth = async (req, res, next) => {
  console.log(req.body)
  const { authorization } = req.headers;
  if (authorization) {
    jwt.verify(authorization, process.env.JWT_SECRET, (err, decode) => {
      if (err) {
        res.status(401).send({ message: "Token is not valid" });
      } else {
        req.user = decode;
        next();
      }
    });
  } else {
    res.status(401).send({ message: "Token is not suppiled" });
  }
};
module.exports =  { signToken, isAuth };
