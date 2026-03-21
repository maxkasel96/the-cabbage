export interface ConfluenceBodyValue {
  representation: 'storage';
  value: string;
}

export interface ConfluenceStorageBody {
  value?: string;
  storage?: ConfluenceBodyValue;
}

export interface ConfluencePageVersion {
  number: number;
  message?: string;
}

export interface ConfluencePageLinks {
  webui?: string;
  editui?: string;
  base?: string;
}

export interface ConfluencePage {
  id: string;
  title: string;
  spaceId: string;
  status: string;
  parentId?: string;
  body: ConfluenceStorageBody;
  version: ConfluencePageVersion;
  _links?: ConfluencePageLinks;
}

export interface ConfluencePageUpdatePayload {
  id: string;
  status: 'current';
  title: string;
  spaceId?: string;
  body: ConfluenceBodyValue;
  version: ConfluencePageVersion;
}

export interface ConfluencePageCreatePayload {
  spaceId: string;
  status: 'current';
  title: string;
  parentId?: string;
  body: ConfluenceBodyValue;
}

export interface ConfluencePageListResponse {
  results: ConfluencePage[];
}

export interface UpsertPageInput {
  spaceId: string;
  parentId: string;
  title: string;
  bodyStorageValue: string;
}

export interface UpsertPageResult {
  page: ConfluencePage;
  action: 'created' | 'updated';
}

export interface IndexLinkInput {
  indexPageId: string;
  linkTitle: string;
  linkPageId: string;
}
