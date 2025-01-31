import { MessageBarType } from '@fluentui/react';

import { ContentType } from '../../../types/enums';
import { IHistoryItem } from '../../../types/history';
import { IQuery } from '../../../types/query-runner';
import { IStatus } from '../../../types/status';
import { ClientError } from '../../utils/error-utils/ClientError';
import { setStatusMessage } from '../../utils/status-message';
import { historyCache } from '../../../modules/cache/history-utils';
import {
  anonymousRequest,
  authenticatedRequest,
  generateResponseDownloadUrl,
  isFileResponse,
  isImageResponse,
  parseResponse,
  queryResponse,
  queryResultsInCorsError
} from './query-action-creator-util';
import { setQueryResponseStatus } from './query-status-action-creator';
import { addHistoryItem } from './request-history-action-creators';

export function runQuery(query: IQuery) {
  return (dispatch: Function, getState: Function) => {
    const tokenPresent = !!getState()?.authToken?.token;
    const respHeaders: any = {};
    const createdAt = new Date().toISOString();

    if (tokenPresent) {
      return authenticatedRequest(dispatch, query)
        .then(async (response: Response) => {
          await processResponse(response, respHeaders, dispatch, createdAt);
        })
        .catch(async (error: any) => {
          return handleError(dispatch, error);
        });
    }

    return anonymousRequest(dispatch, query, getState)
      .then(async (response: Response) => {
        await processResponse(response, respHeaders, dispatch, createdAt);
      })
      .catch(async (error: any) => {
        return handleError(dispatch, error);
      });
  };

  async function processResponse(
    response: Response,
    respHeaders: any,
    dispatch: Function,
    createdAt: any
  ) {
    let result = await parseResponse(response, respHeaders);
    const duration = new Date().getTime() - new Date(createdAt).getTime();
    createHistory(
      response,
      respHeaders,
      query,
      createdAt,
      dispatch,
      result,
      duration
    );

    const status: IStatus = {
      messageType: MessageBarType.error,
      ok: false,
      duration,
      status: response.status || 400,
      statusText: ''
    };

    if (response) {
      status.status = response.status;
      status.statusText =
        response.statusText === ''
          ? setStatusMessage(response.status)
          : response.statusText;
    }

    if (response && response.ok) {
      status.ok = true;
      status.messageType = MessageBarType.success;

      if (isFileResponse(respHeaders)) {
        const contentDownloadUrl = await generateResponseDownloadUrl(
          response,
          respHeaders
        );
        if (contentDownloadUrl) {
          result = {
            contentDownloadUrl
          };
        }
      }
    }

    dispatch(setQueryResponseStatus(status));

    return dispatch(
      queryResponse({
        body: result,
        headers: respHeaders
      })
    );
  }

  function handleError(dispatch: Function, error: any) {
    let body = error;
    const status: IStatus = {
      messageType: MessageBarType.error,
      ok: false,
      status: 400,
      statusText: 'Bad Request'
    };

    if (error instanceof ClientError) {
      status.status = 0;
      status.statusText = `${error.name}: ${error.message}`;
    }

    if (queryResultsInCorsError(query.sampleUrl)) {
      status.status = 0;
      status.statusText = 'CORS error';
      body = {
        throwsCorsError: true
      };
    }

    dispatch(
      queryResponse({
        body,
        headers: null
      })
    );

    return dispatch(setQueryResponseStatus(status));
  }
}

async function createHistory(
  response: Response,
  respHeaders: any,
  query: IQuery,
  createdAt: any,
  dispatch: Function,
  result: any,
  duration: number
) {
  const status = response.status;
  const statusText = response.statusText === '' ? setStatusMessage(status) : response.statusText;
  const responseHeaders = { ...respHeaders };
  const contentType = respHeaders['content-type'];

  if (isImageResponse(contentType)) {
    result = {
      message: 'Run the query to view the image'
    };
    responseHeaders['content-type'] = ContentType.Json;
  }

  if (isFileResponse(respHeaders)) {
    result = {
      message: 'Run the query to generate file download URL'
    };
  }

  const historyItem: IHistoryItem = {
    index: -1,
    url: query.sampleUrl,
    method: query.selectedVerb,
    headers: query.sampleHeaders,
    body: query.sampleBody,
    responseHeaders,
    createdAt,
    status,
    statusText,
    duration,
    result
  };

  historyCache.writeHistoryData(historyItem);

  dispatch(addHistoryItem(historyItem));
  return result;
}
