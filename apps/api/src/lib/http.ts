import type { ErrorRequestHandler } from "express";

type ErrorBody = {
  message: string;
  code?: string;
  field_errors?: Record<string, string>;
  conflict_type?: string;
};

export class ApiError extends Error {
  status: number;
  body: ErrorBody;

  constructor(status: number, body: ErrorBody) {
    super(body.message);
    this.status = status;
    this.body = body;
  }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.status).json(error.body);
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Something went wrong." });
};
