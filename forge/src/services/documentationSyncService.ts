import { buildDocumentationPageStorageValue } from '../builders/confluenceEntryBuilder';
import { CONFLUENCE_INDEX_TITLES, DEFAULT_TARGET_PAGE_ID } from '../config/constants';
import { ValidationError } from '../errors/appError';
import type { ValidatedDocumentationWebhookPayload } from '../types/webhook';
import {
  ConfluencePageService,
  type ConfluencePageServiceContract,
} from './confluencePageService';

export interface DocumentationSyncResult {
  targetPageId: string;
  pageTitle: string;
  newVersion: number;
  pageAction: 'created' | 'updated';
  indexPageId: string;
}

export class DocumentationSyncService {
  constructor(
    private readonly pageService: ConfluencePageServiceContract = new ConfluencePageService(),
  ) {}

  async sync(payload: ValidatedDocumentationWebhookPayload): Promise<DocumentationSyncResult> {
    const receivedAt = new Date().toISOString();
    const anchorPage = await this.pageService.getPageDetails(DEFAULT_TARGET_PAGE_ID);
    const indexPage = await this.pageService.findPageByTitle(
      anchorPage.spaceId,
      CONFLUENCE_INDEX_TITLES[payload.pageType],
    );

    if (!indexPage) {
      throw new ValidationError('Required documentation index page was not found.', {
        pageType: payload.pageType,
        expectedIndexTitle: CONFLUENCE_INDEX_TITLES[payload.pageType],
        spaceId: anchorPage.spaceId,
      });
    }

    const initialBodyStorageValue = buildDocumentationPageStorageValue({
      payload,
      receivedAt,
      indexPageId: indexPage.id,
    });

    const detailPageResult = await this.pageService.upsertPage({
      spaceId: anchorPage.spaceId,
      parentId: indexPage.id,
      title: payload.title,
      bodyStorageValue: initialBodyStorageValue,
    });

    const finalBodyStorageValue = buildDocumentationPageStorageValue({
      payload,
      receivedAt,
      indexPageId: indexPage.id,
      detailPageId: detailPageResult.page.id,
    });

    const syncedDetailPageResult = await this.pageService.upsertPage({
      spaceId: anchorPage.spaceId,
      parentId: indexPage.id,
      title: payload.title,
      bodyStorageValue: finalBodyStorageValue,
    });

    await this.pageService.ensureIndexLink({
      indexPageId: indexPage.id,
      pageType: payload.pageType,
      linkTitle: payload.title,
      linkPageId: syncedDetailPageResult.page.id,
    });

    return {
      targetPageId: syncedDetailPageResult.page.id,
      pageTitle: syncedDetailPageResult.page.title,
      newVersion: syncedDetailPageResult.page.version.number,
      pageAction: detailPageResult.action === 'created' ? 'created' : syncedDetailPageResult.action,
      indexPageId: indexPage.id,
    };
  }
}
