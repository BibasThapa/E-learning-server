import { NextFunction, Request, Response } from "express";

import ErrorHandler from "../utils/ErrorHandler";


export const ErrorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Set default values for statusCode and message
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal server error";

  // Handle MongoDB CastError (Invalid ObjectId)
  if (err.name === "CastError") {
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // Handle MongoDB Duplicate Key Error
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue).join(", ")} entered`;
    err = new ErrorHandler(message, 400);
  }

  // Handle JSON Web Token Errors
  if (err.name === "JsonWebTokenError") {
    const message = "Json web token is invalid, try again";
    err = new ErrorHandler(message, 400);
  }

  if (err.name === "TokenExpiredError") {
    const message = "Json web token is expired, try again";
    err = new ErrorHandler(message, 400);
  }

  // Log the error details for debugging
  console.error(err);

  // Send error response
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};
