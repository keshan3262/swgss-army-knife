import { NextFunction, Request, Response } from 'express';

type Args = [
  req: Request,
  res: Response<any, { filesHashes?: string[] | Record<string, string[]> }>,
  next: NextFunction
];

export const withAsyncException = (fn: (...args: Args) => Promise<void>): (...args: Args) => void =>
  (req, res, next) => fn(req, res, next).catch(next);
