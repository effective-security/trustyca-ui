import type { PartialMessage } from '@protobuf-ts/runtime';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import { Empty } from 'src/services/trustyca/protogen/google/protobuf/empty';
import {
  AddMemberRequest,
  AddMemberResponse,
  APIKey,
  APIKeyRequest,
  APIKeysResponse,
  ChangeMemberRoleRequest,
  CreateAPIKeyRequest,
  DeleteInviteRequest,
  DeleteMemberRequest,
  DeleteProjectRequest,
  EventsResponse,
  GetMembersRequest,
  GetProjectRequest,
  ListAPIKeysRequest,
  ListEventsRequest,
  ListProjectsRequest,
  MembersResponse,
  Membership,
  Org,
  Project,
  ProjectsResponse,
  RegisterOrgRequest,
  RegisterProjectRequest,
  UpdateOrgRequest,
  UpdateProjectRequest,
  UserMemberships,
  UserOrgsResponse,
} from 'src/services/trustyca/protogen/orgs';
import { OrgsClient } from 'src/services/trustyca/protogen/orgs.client';
import { RecordsResult } from 'src/services/trustyca/protogen/types';
import { unary } from './call';

/**
 * The org of the token: its projects, members and invites, API keys and
 * audit events. No request carries the org; ProjectID selects project scope.
 */
export interface IOrgsService {
  registerOrg(req: PartialMessage<RegisterOrgRequest>): Promise<Org>;
  getOrg(): Promise<Org>;
  updateOrg(req: PartialMessage<UpdateOrgRequest>): Promise<Org>;
  deleteOrg(): Promise<Org>;
  getUserOrgs(): Promise<UserOrgsResponse>;
  getUserMemberships(): Promise<UserMemberships>;
  getMembers(req: PartialMessage<GetMembersRequest>): Promise<MembersResponse>;
  addMember(req: PartialMessage<AddMemberRequest>): Promise<AddMemberResponse>;
  changeMemberRole(req: PartialMessage<ChangeMemberRoleRequest>): Promise<Membership>;
  deleteMember(req: PartialMessage<DeleteMemberRequest>): Promise<void>;
  deleteInvite(req: PartialMessage<DeleteInviteRequest>): Promise<void>;
  registerProject(req: PartialMessage<RegisterProjectRequest>): Promise<Project>;
  updateProject(req: PartialMessage<UpdateProjectRequest>): Promise<Project>;
  getProject(req: PartialMessage<GetProjectRequest>): Promise<Project>;
  listProjects(req: PartialMessage<ListProjectsRequest>): Promise<ProjectsResponse>;
  deleteProject(req: PartialMessage<DeleteProjectRequest>): Promise<Project>;
  listEvents(req: PartialMessage<ListEventsRequest>): Promise<EventsResponse>;
  createAPIKey(req: PartialMessage<CreateAPIKeyRequest>): Promise<APIKey>;
  listAPIKeys(req: PartialMessage<ListAPIKeysRequest>): Promise<APIKeysResponse>;
  deleteAPIKey(req: PartialMessage<APIKeyRequest>): Promise<RecordsResult>;
}

export class OrgsService implements IOrgsService {
  private readonly $rpc: OrgsClient;

  constructor(transport: RpcTransport) {
    this.$rpc = new OrgsClient(transport);
  }

  registerOrg(req: PartialMessage<RegisterOrgRequest>): Promise<Org> {
    return unary('OrgsService: registerOrg', RegisterOrgRequest.create(req), (i, o) =>
      this.$rpc.registerOrg(i, o),
    );
  }

  getOrg(): Promise<Org> {
    return unary('OrgsService: getOrg', Empty.create(), (i, o) => this.$rpc.getOrg(i, o));
  }

  updateOrg(req: PartialMessage<UpdateOrgRequest>): Promise<Org> {
    return unary('OrgsService: updateOrg', UpdateOrgRequest.create(req), (i, o) =>
      this.$rpc.updateOrg(i, o),
    );
  }

  deleteOrg(): Promise<Org> {
    return unary('OrgsService: deleteOrg', Empty.create(), (i, o) => this.$rpc.deleteOrg(i, o));
  }

  getUserOrgs(): Promise<UserOrgsResponse> {
    return unary('OrgsService: getUserOrgs', Empty.create(), (i, o) => this.$rpc.getUserOrgs(i, o));
  }

  getUserMemberships(): Promise<UserMemberships> {
    return unary('OrgsService: getUserMemberships', Empty.create(), (i, o) =>
      this.$rpc.getUserMemberships(i, o),
    );
  }

  getMembers(req: PartialMessage<GetMembersRequest>): Promise<MembersResponse> {
    return unary('OrgsService: getMembers', GetMembersRequest.create(req), (i, o) =>
      this.$rpc.getMembers(i, o),
    );
  }

  addMember(req: PartialMessage<AddMemberRequest>): Promise<AddMemberResponse> {
    return unary('OrgsService: addMember', AddMemberRequest.create(req), (i, o) =>
      this.$rpc.addMember(i, o),
    );
  }

  changeMemberRole(req: PartialMessage<ChangeMemberRoleRequest>): Promise<Membership> {
    return unary('OrgsService: changeMemberRole', ChangeMemberRoleRequest.create(req), (i, o) =>
      this.$rpc.changeMemberRole(i, o),
    );
  }

  async deleteMember(req: PartialMessage<DeleteMemberRequest>): Promise<void> {
    await unary('OrgsService: deleteMember', DeleteMemberRequest.create(req), (i, o) =>
      this.$rpc.deleteMember(i, o),
    );
  }

  async deleteInvite(req: PartialMessage<DeleteInviteRequest>): Promise<void> {
    await unary('OrgsService: deleteInvite', DeleteInviteRequest.create(req), (i, o) =>
      this.$rpc.deleteInvite(i, o),
    );
  }

  registerProject(req: PartialMessage<RegisterProjectRequest>): Promise<Project> {
    return unary('OrgsService: registerProject', RegisterProjectRequest.create(req), (i, o) =>
      this.$rpc.registerProject(i, o),
    );
  }

  updateProject(req: PartialMessage<UpdateProjectRequest>): Promise<Project> {
    return unary('OrgsService: updateProject', UpdateProjectRequest.create(req), (i, o) =>
      this.$rpc.updateProject(i, o),
    );
  }

  getProject(req: PartialMessage<GetProjectRequest>): Promise<Project> {
    return unary('OrgsService: getProject', GetProjectRequest.create(req), (i, o) =>
      this.$rpc.getProject(i, o),
    );
  }

  listProjects(req: PartialMessage<ListProjectsRequest>): Promise<ProjectsResponse> {
    return unary('OrgsService: listProjects', ListProjectsRequest.create(req), (i, o) =>
      this.$rpc.listProjects(i, o),
    );
  }

  deleteProject(req: PartialMessage<DeleteProjectRequest>): Promise<Project> {
    return unary('OrgsService: deleteProject', DeleteProjectRequest.create(req), (i, o) =>
      this.$rpc.deleteProject(i, o),
    );
  }

  listEvents(req: PartialMessage<ListEventsRequest>): Promise<EventsResponse> {
    return unary('OrgsService: listEvents', ListEventsRequest.create(req), (i, o) =>
      this.$rpc.listEvents(i, o),
    );
  }

  createAPIKey(req: PartialMessage<CreateAPIKeyRequest>): Promise<APIKey> {
    return unary('OrgsService: createAPIKey', CreateAPIKeyRequest.create(req), (i, o) =>
      this.$rpc.createAPIKey(i, o),
    );
  }

  listAPIKeys(req: PartialMessage<ListAPIKeysRequest>): Promise<APIKeysResponse> {
    return unary('OrgsService: listAPIKeys', ListAPIKeysRequest.create(req), (i, o) =>
      this.$rpc.listAPIKeys(i, o),
    );
  }

  deleteAPIKey(req: PartialMessage<APIKeyRequest>): Promise<RecordsResult> {
    return unary('OrgsService: deleteAPIKey', APIKeyRequest.create(req), (i, o) =>
      this.$rpc.deleteAPIKey(i, o),
    );
  }
}
