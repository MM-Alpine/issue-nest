import type { RequestHandler } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { currentUser } from '../../middleware/authenticate';
import type { IssueIdParams } from '../../shared/schemas';
import type { CreateCommentBody } from './comments.schema';
import * as commentsService from './comments.service';

export const list: RequestHandler<IssueIdParams> = asyncHandler(async (req, res) => {
  const comments = await commentsService.listComments(req.params.issueId, currentUser(req).id);
  res.status(200).json({ comments });
});

export const create: RequestHandler<IssueIdParams, unknown, CreateCommentBody> = asyncHandler(
  async (req, res) => {
    const comment = await commentsService.createComment(
      req.params.issueId,
      currentUser(req).id,
      req.body,
    );
    res.status(201).json({ comment });
  },
);
