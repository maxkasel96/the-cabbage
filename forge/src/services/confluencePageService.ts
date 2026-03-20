import { ConfluenceClient } from '../clients/confluenceClient';
import { DEFAULT_TARGET_PAGE_ID } from '../config/constants';
import type {
  AppendEntryInput,
  AppendEntryResult,
  ConfluencePage,
  ConfluencePageUpdatePayload,
  RoutePageAppendInput,
  RoutePageAppendResult,
} from '../types/confluence';

export interface ConfluencePageServiceContract {
  getPageDetails(pageId: string): Promise<ConfluencePage>;
  appendEntry(input: AppendEntryInput): Promise<AppendEntryResult>;
  appendEntryToRoutedPage(input: RoutePageAppendInput): Promise<RoutePageAppendResult>;
}

export class ConfluencePageService implements ConfluencePageServiceContract {
  constructor(private readonly client: ConfluenceClient = new ConfluenceClient()) {}

  async getPageDetails(pageId: string = DEFAULT_TARGET_PAGE_ID): Promise<ConfluencePage> {
    return this.client.getPage(pageId);
  }

  async appendEntry(input: AppendEntryInput): Promise<AppendEntryResult> {
    const page = await this.getPageDetails(input.pageId);
    // TODO: Add retry-safe version conflict handling for concurrent append operations.
    const updatePayload = this.buildUpdatePayload(page, input.entryStorageValue);
    const updatedPage = await this.client.updatePage(page.id, updatePayload);

    return {
      pageId: updatedPage.id,
      pageTitle: updatedPage.title,
      newVersion: updatedPage.version.number,
    };
  }

  async appendEntryToRoutedPage(input: RoutePageAppendInput): Promise<RoutePageAppendResult> {
    const fallbackPage = await this.getPageDetails(input.fallbackPageId);

    try {
      const existingPage = await this.client.findPageByTitle(fallbackPage.spaceId, input.pageTitle);

      console.log('[docs-sync] page lookup result', {
        pageTitle: input.pageTitle,
        existingPageId: existingPage?.id ?? null,
        existingPageFound: Boolean(existingPage),
      });

      if (existingPage) {
        const updatedPage = await this.appendEntry({
          pageId: existingPage.id,
          entryStorageValue: input.entryStorageValue,
        });

        return {
          ...updatedPage,
          existingPageFound: true,
          fallbackUsed: false,
        };
      }

      const createdPage = await this.client.createPage({
        spaceId: fallbackPage.spaceId,
        title: input.pageTitle,
        bodyValue: input.entryStorageValue,
      });

      return {
        pageId: createdPage.id,
        pageTitle: createdPage.title,
        newVersion: createdPage.version.number,
        existingPageFound: false,
        fallbackUsed: false,
      };
    } catch (error) {
      // Explicit fallback: only use the legacy default page if routed lookup or page creation fails.
      console.warn('[docs-sync] routed page resolution failed; falling back to legacy default page', {
        pageTitle: input.pageTitle,
        fallbackPageId: input.fallbackPageId,
        error: error instanceof Error ? error.message : String(error),
      });

      const fallbackResult = await this.appendEntry({
        pageId: input.fallbackPageId,
        entryStorageValue: input.entryStorageValue,
      });

      return {
        ...fallbackResult,
        existingPageFound: false,
        fallbackUsed: true,
      };
    }
  }

  private buildUpdatePayload(
    page: ConfluencePage,
    entryStorageValue: string,
  ): ConfluencePageUpdatePayload {
    const existingStorageValue = page.body.value ?? '';
    const nextBodyValue = `${existingStorageValue}${entryStorageValue}`;

    return {
      id: page.id,
      status: 'current',
      title: page.title,
      spaceId: page.spaceId,
      body: {
        representation: 'storage',
        value: nextBodyValue,
      },
      version: {
        number: page.version.number + 1,
      },
    };
  }
}
