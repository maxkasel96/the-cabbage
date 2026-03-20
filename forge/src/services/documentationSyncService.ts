import { buildDocumentationEntryStorageValue } from '../builders/confluenceEntryBuilder';
import { DEFAULT_TARGET_PAGE_ID } from '../config/constants';
import { routeDocumentationPage } from '../routing/documentationPageRouting';
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
    console.log('[docs-sync] incoming payload', {
      feature: payload.feature,
      eventType: payload.eventType,
    });

    const routingResult = routeDocumentationPage(payload);

    console.log('[docs-sync] routing result', routingResult);

    const entryStorageValue = buildDocumentationEntryStorageValue({
      payload,
      receivedAt: new Date().toISOString(),
    });

    const result = await this.pageService.appendEntryToRoutedPage({
      pageTitle: routingResult.pageTitle,
      entryStorageValue,
      fallbackPageId: DEFAULT_TARGET_PAGE_ID,
    });

    console.log('[docs-sync] final page selection', {
      pageTitle: result.pageTitle,
      pageId: result.pageId,
      existingPageFound: result.existingPageFound,
      fallbackUsed: result.fallbackUsed,
    });

    return {
      ...result,
      targetPageId: result.pageId,
    };
  }
}
