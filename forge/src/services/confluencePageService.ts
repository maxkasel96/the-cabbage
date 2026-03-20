import { ConfluenceClient } from '../clients/confluenceClient';
import { DEFAULT_TARGET_PAGE_ID } from '../config/constants';
import type {
  AppendEntryInput,
  AppendEntryResult,
  ConfluencePage,
  ConfluencePageUpdatePayload,
} from '../types/confluence';

export interface ConfluencePageServiceContract {
  getPageDetails(pageId: string): Promise<ConfluencePage>;
  appendEntry(input: AppendEntryInput): Promise<AppendEntryResult>;
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
