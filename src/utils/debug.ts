import "colors";
type LogLevel = "info" | "warn" | "error" | "debug";

export var log = (message: string, level: LogLevel = "info") => {
  const date = new Date();
  const timestamp = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  if (!process.env.VERBOSE && level === "debug") {
    return;
  }
  message = `[${timestamp}] [${level}] ` + message;
  switch (level) {
    case "info":
      message = message.green;
      break;
    case "warn":
      message = message.yellow;
      break;
    case "error":
      message = message.red;
      break;
    case "debug":
      message = message.blue;
      break;
  }

  console.log(message);
};
