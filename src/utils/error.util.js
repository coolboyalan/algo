import mongoose from "mongoose";
import { session, transactionMethods } from "#middlewares/session";

export default async function globalErrorHandler(err, req, res, next) {
  let statusCode = err.httpStatus ?? 500;
  let message = err.message;

  // TODO: transaction has to implemented here
  /**if (transactionMethods.includes(req.method)) {
    const transactionSession = session.get("transaction");
    await transactionSession.abortTransaction();
  }*/

  if (err instanceof mongoose.Error) {
    switch (true) {
      case err instanceof mongoose.Error.ValidationError:
        statusCode = 400;
        message = Object.values(err.errors)
          .map((error) => error.message)
          .join(", ");
        break;

      case err instanceof mongoose.Error.CastError:
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
        break;

      case err instanceof mongoose.Error.MongooseServerSelectionError:
        statusCode = 503;
        message = "Database connection error. Please try again later.";
        break;

      case err instanceof mongoose.Error.DocumentNotFoundError:
        statusCode = 404;
        message = "Document not found.";
        break;

      case err instanceof mongoose.Error.StrictModeError:
        statusCode = 400;
        message = "Attempted to save a field not defined in the schema.";
        break;

      default:
        statusCode = 500;
        message = "An unexpected database error occurred.";
    }
  }

  if (err instanceof SyntaxError && err.status === 400) {
    statusCode = 400;
    message = "Invalid JSON syntax.";
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = "";
    for (let i in err.keyPattern) {
      message += `${i} with value '${err.keyValue[i]}' already exists`;
    }
  }

  // Fallback for any other uncaught errors
  if (!statusCode || !message) {
    statusCode = 500;
    message = "An unexpected error occurred.";
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}
