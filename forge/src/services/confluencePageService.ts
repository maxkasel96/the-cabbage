import { ensureIndexEntryInStorageValue } from '../builders/confluenceEntryBuilder';
import { DEFAULT_TARGET_PAGE_ID } from '../config/constants';
import { ValidationError } from '../errors/appError';
import { ConfluenceClient } from '../clients/confluenceClient';
import type {
  ConfluencePage,
  ConfluencePageCreatePayload,
  ConfluencePageUpdatePayload,
  IndexLinkInput,
  UpsertPageInput,
  UpsertPageResult,
} from '../types/confluence';
import type { SupportedPageType } from '../types/webhook';

export interface ConfluencePageServiceContract {
  getPageDetails(pageId: string): Promise<ConfluencePage>;
  findPageByTitle(spaceId: string, title: string, parentId?: string): Promise<ConfluencePage | null>;
  upsertPage(input: UpsertPageInput): Promise<UpsertPageResult>;
  ensureIndexLink(input: IndexLinkInput & { pageType: SupportedPageType }): Promise<ConfluencePage>;
}

export class ConfluencePageService implements ConfluencePageServiceContract {
  constructor(private readonly client: ConfluenceClient = new ConfluenceClient()) {}

  async getPageDetails(pageId: string = DEFAULT_TARGET_PAGE_ID): Promise<ConfluencePage> {
    return this.client.getPage(pageId);
  }

  async findPageByTitle(
    spaceId: string,
    title: string,
    parentId?: string,
  ): Promise<ConfluencePage | null> {
    const matchingPages = await this.client.findPagesByTitle(spaceId, title);

    return (
      matchingPages.find((page) => page.title === title && (parentId === undefined || page.parentId === parentId)) ??
      null
    );
  }

  async upsertPage(input: UpsertPageInput): Promise<UpsertPageResult> {
    const existingPage = await this.findPageByTitle(input.spaceId, input.title, input.parentId);

    if (!existingPage) {
      const createdPage = await this.client.createPage(this.buildCreatePayload(input));

      return {
        page: createdPage,
        action: 'created',
      };
    }

    const updatedPage = await this.client.updatePage(existingPage.id, {
      id: existingPage.id,
      status: 'current',
      title: existingPage.title,
      spaceId: existingPage.spaceId,
      body: {
        representation: 'storage',
        value: input.bodyStorageValue,
      },
      version: {
        number: existingPage.version.number + 1,
      },
    });

    return {
      page: updatedPage,
      action: 'updated',
    };
  }

  async ensureIndexLink(input: IndexLinkInput & { pageType: SupportedPageType }): Promise<ConfluencePage> {
    const indexPage = await this.getPageDetails(input.indexPageId);
    const existingStorageValue = getStorageValue(indexPage);
    const nextStorageValue = ensureIndexEntryInStorageValue(
      existingStorageValue,
      input.pageType,
      input.linkTitle,
      input.linkPageId,
    );

    if (nextStorageValue === existingStorageValue) {
      return indexPage;
    }

    return this.client.updatePage(indexPage.id, this.buildUpdatePayload(indexPage, nextStorageValue));
  }

  private buildCreatePayload(input: UpsertPageInput): ConfluencePageCreatePayload {
    return {
      spaceId: input.spaceId,
      status: 'current',
      title: input.title,
      parentId: input.parentId,
      body: {
        representation: 'storage',
        value: input.bodyStorageValue,
      },
    };
  }

  private buildUpdatePayload(page: ConfluencePage, storageValue: string): ConfluencePageUpdatePayload {
    if (!page.spaceId) {
      throw new ValidationError('Confluence page is missing a spaceId.', {
        pageId: page.id,
      });
    }

    return {
      id: page.id,
      status: 'current',
      title: page.title,
      spaceId: page.spaceId,
      body: {
        representation: 'storage',
        value: storageValue,
      },
      version: {
        number: page.version.number + 1,
      },
    };
  }
}

export function getStorageValue(page: ConfluencePage): string {
  return page.body.storage?.value ?? page.body.value ?? '';
}
