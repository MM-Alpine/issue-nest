import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { asyncHandler } from '../../lib/async-handler';
import { currentUser } from '../../middleware/authenticate';
import type { ProjectIdParams } from '../../shared/schemas';
import type { AddMemberBody, CreateProjectBody } from './projects.schema';
import * as projectsService from './projects.service';

export const create: RequestHandler<ParamsDictionary, unknown, CreateProjectBody> = asyncHandler(
  async (req, res) => {
    const project = await projectsService.createProject(currentUser(req).id, req.body);
    res.status(201).json({ project });
  },
);

export const list: RequestHandler = asyncHandler(async (req, res) => {
  const projects = await projectsService.listProjects(currentUser(req).id);
  res.status(200).json({ projects });
});

export const detail: RequestHandler<ProjectIdParams> = asyncHandler(async (req, res) => {
  const project = await projectsService.getProject(req.params.projectId, currentUser(req).id);
  res.status(200).json({ project });
});

export const listMembers: RequestHandler<ProjectIdParams> = asyncHandler(async (req, res) => {
  const members = await projectsService.listMembers(req.params.projectId, currentUser(req).id);
  res.status(200).json({ members });
});

export const addMember: RequestHandler<ProjectIdParams, unknown, AddMemberBody> = asyncHandler(
  async (req, res) => {
    const member = await projectsService.addMember(
      req.params.projectId,
      currentUser(req).id,
      req.body,
    );
    res.status(201).json({ member });
  },
);
