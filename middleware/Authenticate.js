import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const authHeaders = req.headers.authorization;

  if (authHeaders === null || authHeaders === undefined) {
    return res.status(401).json({ status: 401, message: "Unauthorized" });
  }

  const token = authHeaders.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err)
      return res.status(401).json({ status: 401, message: "Unauthorized" });

    req.user = user;
    next();
  });
};

export default authMiddleware;
