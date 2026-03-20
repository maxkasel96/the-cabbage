import { buildDocumentationEntryStorageValue } from '../builders/confluenceEntryBuilder';
import { DEFAULT_TARGET_PAGE_ID } from '../config/constants';
import type { AppendEntryResult } from '../types/confluence';
import type { ValidatedDocumentationWebhookPayload } from '../types/webhook';
import {
  ConfluencePageService,
  type ConfluencePageServiceContract,
} from './confluencePageService';

export interface DocumentationSyncResult extends AppendEntryResult {
  targetPageId: string;
}

export class DocumentationSyncService {
  constructor(
    private readonly pageService: ConfluencePageServiceContract = new ConfluencePageService(),
  ) {}

  async sync(payload: ValidatedDocumentationWebhookPayload): Promise<DocumentationSyncResult> {
    const entryStorageValue = buildDocumentationEntryStorageValue({
      payload,
      receivedAt: new Date().toISOString(),
    });

    const result = await this.pageService.appendEntry({
      pageId: DEFAULT_TARGET_PAGE_ID,
      entryStorageValue,
    });

    return {
      ...result,
      targetPageId: DEFAULT_TARGET_PAGE_ID,
    };
  }
}
