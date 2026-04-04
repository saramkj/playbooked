import type { ErrorRequestHandler } from "express";

type ErrorBody = {
  message: string;
  code?: string;
  field_errors?: Record<string, string>;
  gate_errors?: Array<{
    gate: "G1" | "G2" | "G3" | "G4" | "G5";
    passed: false;
    message: string;
  }>;
  passed_gate_count?: number | null;
  conflict_type?: string;
  planned_trade_id?: string;
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
  if (error instanceof SyntaxError && "body" in error) {
    res.status(422).json({
      message: "Validation failed.",
      field_errors: {
        body: "Malformed JSON request body.",
      },
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json(error.body);
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Something went wrong." });
};
