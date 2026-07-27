import type { RequestHandler } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { validatedQuery } from '../../lib/http';
import { currentUser } from '../../middleware/authenticate';
import type { IssueIdParams, ProjectIdParams } from '../../shared/schemas';
import type { CreateIssueBody, IssueListQuery, UpdateIssueBody } from './issues.schema';
import * as issuesService from './issues.service';

export const list: RequestHandler<ProjectIdParams> = asyncHandler(async (req, res) => {
  const result = await issuesService.listIssues(
    req.params.projectId,
    currentUser(req).id,
    validatedQuery<IssueListQuery>(req),
  );
  res.status(200).json(result);
});

export const create: RequestHandler<ProjectIdParams, unknown, CreateIssueBody> = asyncHandler(
  async (req, res) => {
    const issue = await issuesService.createIssue(
      req.params.projectId,
      currentUser(req).id,
      req.body,
    );
    res.status(201).json({ issue });
  },
);

export const detail: RequestHandler<IssueIdParams> = asyncHandler(async (req, res) => {
  const result = await issuesService.getIssue(req.params.issueId, currentUser(req).id);
  res.status(200).json(result);
});

export const update: RequestHandler<IssueIdParams, unknown, UpdateIssueBody> = asyncHandler(
  async (req, res) => {
    const issue = await issuesService.updateIssue(
      req.params.issueId,
      currentUser(req).id,
      req.body,
    );
    res.status(200).json({ issue });
  },
);

export const remove: RequestHandler<IssueIdParams> = asyncHandler(async (req, res) => {
  await issuesService.deleteIssue(req.params.issueId, currentUser(req).id);
  res.status(204).send();
});
