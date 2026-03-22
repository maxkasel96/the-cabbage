import {
  CONFLUENCE_SITE_BASE_URL,
  CONFLUENCE_SPACE_KEY,
  FUTURE_SECRET_HEADER_NAME,
  WEBHOOK_SHARED_SECRET,
} from '../config/constants';
import { UnauthorizedError } from '../errors/appError';
import {
  assertHttpMethod,
  getHeader,
  parseWebhookRequestBody,
  type ForgeWebTriggerRequest,
} from '../http/request';
import { errorResponse, okResponse, type ForgeWebTriggerResponse } from '../http/response';
import { DocumentationSyncService } from '../services/documentationSyncService';
import { validateDocumentationWebhookPayload } from '../validation/webhookPayload';

const documentationSyncService = new DocumentationSyncService();

export async function documentationWebhookHandler(
  request: ForgeWebTriggerRequest,
): Promise<ForgeWebTriggerResponse> {
  try {
    assertHttpMethod(request, 'POST');
    assertSharedSecretIfConfigured(request);

    const payload = parseWebhookRequestBody(request);
    const validatedPayload = validateDocumentationWebhookPayload(payload);
    const syncResult = await documentationSyncService.sync(validatedPayload);

    return okResponse('Documentation page synced successfully.', {
      source: validatedPayload.source,
      eventType: validatedPayload.eventType,
      pageType: validatedPayload.pageType,
      targetPageId: syncResult.targetPageId,
      pageTitle: syncResult.pageTitle,
      pageAction: syncResult.pageAction,
      newVersion: syncResult.newVersion,
      indexPageId: syncResult.indexPageId,
      spaceKey: CONFLUENCE_SPACE_KEY,
      siteBaseUrl: CONFLUENCE_SITE_BASE_URL,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function assertSharedSecretIfConfigured(request: ForgeWebTriggerRequest): void {
  if (!WEBHOOK_SHARED_SECRET) {
    return;
  }

  const receivedSecret = getHeader(request, FUTURE_SECRET_HEADER_NAME);

  if (receivedSecret !== WEBHOOK_SHARED_SECRET) {
    throw new UnauthorizedError('Webhook secret did not match configured value.');
  }
}
