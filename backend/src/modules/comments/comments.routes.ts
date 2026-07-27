import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { IssueIdParams } from '../../shared/schemas';
import * as commentsController from './comments.controller';
import { CreateCommentBody } from './comments.schema';

/** Mounted at /api/issues/:issueId/comments */
export const commentsRouter = Router({ mergeParams: true });

commentsRouter.use(authenticate);

commentsRouter.get('/', validate({ params: IssueIdParams }), commentsController.list);

commentsRouter.post(
  '/',
  validate({ params: IssueIdParams, body: CreateCommentBody }),
  commentsController.create,
);
