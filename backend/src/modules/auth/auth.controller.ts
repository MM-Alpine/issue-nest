import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { asyncHandler } from '../../lib/async-handler';
import { currentUser } from '../../middleware/authenticate';
import type { LoginBody, SignupBody } from './auth.schema';
import * as authService from './auth.service';

export const signup: RequestHandler<ParamsDictionary, unknown, SignupBody> = asyncHandler(
  async (req, res) => {
    const result = await authService.signup(req.body);
    res.status(201).json(result);
  },
);

export const login: RequestHandler<ParamsDictionary, unknown, LoginBody> = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json(result);
});

/** Bearer JWTs are stateless: logout is client-side disposal (docs/01 A11). */
export const logout: RequestHandler = (_req, res) => {
  res.status(204).send();
};

export const me: RequestHandler = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(currentUser(req).id);
  res.status(200).json({ user });
});
