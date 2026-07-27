import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import * as authController from './auth.controller';
import { LoginBody, SignupBody } from './auth.schema';

export const authRouter = Router();

authRouter.post('/signup', validate({ body: SignupBody }), authController.signup);
authRouter.post('/login', validate({ body: LoginBody }), authController.login);
authRouter.post('/logout', authenticate, authController.logout);

/** Mounted separately at /api/me. */
export const meRouter = Router();
meRouter.get('/', authenticate, authController.me);
