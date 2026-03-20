export interface ConfluenceStorageBody {
  representation: 'storage';
  value: string;
}

export interface ConfluencePageVersion {
  number: number;
}

export interface ConfluencePage {
  id: string;
  title: string;
  spaceId: string;
  status: string;
  body: ConfluenceStorageBody;
  version: ConfluencePageVersion;
}

export interface ConfluencePageUpdatePayload {
  id: string;
  status: 'current';
  title: string;
  spaceId: string;
  body: ConfluenceStorageBody;
  version: ConfluencePageVersion;
}

export interface AppendEntryInput {
  pageId: string;
  entryStorageValue: string;
}

export interface AppendEntryResult {
  pageId: string;
  pageTitle: string;
  newVersion: number;
}
