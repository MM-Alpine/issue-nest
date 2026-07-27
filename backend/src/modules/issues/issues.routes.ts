import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { IssueIdParams, ProjectIdParams } from '../../shared/schemas';
import * as issuesController from './issues.controller';
import { CreateIssueBody, IssueListQuery, UpdateIssueBody } from './issues.schema';

/** Mounted at /api/projects/:projectId/issues */
export const projectIssuesRouter = Router({ mergeParams: true });

projectIssuesRouter.use(authenticate);

projectIssuesRouter.get(
  '/',
  validate({ params: ProjectIdParams, query: IssueListQuery }),
  issuesController.list,
);

projectIssuesRouter.post(
  '/',
  validate({ params: ProjectIdParams, body: CreateIssueBody }),
  issuesController.create,
);

/** Mounted at /api/issues */
export const issuesRouter = Router();

issuesRouter.use(authenticate);

issuesRouter.get('/:issueId', validate({ params: IssueIdParams }), issuesController.detail);

issuesRouter.patch(
  '/:issueId',
  validate({ params: IssueIdParams, body: UpdateIssueBody }),
  issuesController.update,
);

issuesRouter.delete('/:issueId', validate({ params: IssueIdParams }), issuesController.remove);
