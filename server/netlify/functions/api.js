const serverless = require("serverless-http");

const app = require("../../index");

const handler = serverless(app);

exports.handler = async (event, context) => {
  const functionPrefix = "/.netlify/functions/api";
  if (event.path?.startsWith(functionPrefix)) {
    event.path = event.path.slice(functionPrefix.length) || "/";
  }

  return handler(event, context);
};
