import api, { route } from '@forge/api';
import {
  CONFLUENCE_API_V2_BASE_PATH,
  CONFLUENCE_PAGE_BODY_FORMAT,
} from '../config/constants';
import { ConfluenceApiError } from '../errors/appError';
import type {
  ConfluencePage,
  ConfluencePageCreatePayload,
  ConfluencePageListResponse,
  ConfluencePageUpdatePayload,
} from '../types/confluence';

export class ConfluenceClient {
  async getPage(pageId: string): Promise<ConfluencePage> {
    const response = await api.asApp().requestConfluence(
      route`${CONFLUENCE_API_V2_BASE_PATH}/pages/${pageId}?body-format=${CONFLUENCE_PAGE_BODY_FORMAT}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    );

    return parseJsonResponse<ConfluencePage>(response, 'Failed to fetch Confluence page.');
  }

  async findPagesByTitle(spaceId: string, title: string): Promise<ConfluencePage[]> {
    const response = await api.asApp().requestConfluence(
      route`${CONFLUENCE_API_V2_BASE_PATH}/pages?space-id=${spaceId}&title=${title}&status=current&body-format=${CONFLUENCE_PAGE_BODY_FORMAT}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    );

    const payload = await parseJsonResponse<ConfluencePageListResponse>(
      response,
      'Failed to search Confluence pages by title.',
    );

    return payload.results ?? [];
  }

  async createPage(payload: ConfluencePageCreatePayload): Promise<ConfluencePage> {
    const response = await api.asApp().requestConfluence(route`${CONFLUENCE_API_V2_BASE_PATH}/pages`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return parseJsonResponse<ConfluencePage>(response, 'Failed to create Confluence page.');
  }

  async updatePage(pageId: string, payload: ConfluencePageUpdatePayload): Promise<ConfluencePage> {
    const response = await api.asApp().requestConfluence(
      route`${CONFLUENCE_API_V2_BASE_PATH}/pages/${pageId}`,
      {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    return parseJsonResponse<ConfluencePage>(response, 'Failed to update Confluence page.');
  }
}

interface ConfluenceHttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

async function parseJsonResponse<T>(response: ConfluenceHttpResponse, message: string): Promise<T> {
  if (!response.ok) {
    const responseText = await response.text();

    throw new ConfluenceApiError(message, response.status, {
      details: {
        status: response.status,
        responseBody: responseText,
      },
    });
  }

  return (await response.json()) as T;
}
