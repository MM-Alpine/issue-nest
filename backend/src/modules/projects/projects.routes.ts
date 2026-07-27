import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { ProjectIdParams } from '../../shared/schemas';
import * as projectsController from './projects.controller';
import { AddMemberBody, CreateProjectBody } from './projects.schema';

export const projectsRouter = Router();

projectsRouter.use(authenticate);

projectsRouter.post('/', validate({ body: CreateProjectBody }), projectsController.create);
projectsRouter.get('/', projectsController.list);

projectsRouter.get(
  '/:projectId',
  validate({ params: ProjectIdParams }),
  projectsController.detail,
);

projectsRouter.get(
  '/:projectId/members',
  validate({ params: ProjectIdParams }),
  projectsController.listMembers,
);

projectsRouter.post(
  '/:projectId/members',
  validate({ params: ProjectIdParams, body: AddMemberBody }),
  projectsController.addMember,
);
