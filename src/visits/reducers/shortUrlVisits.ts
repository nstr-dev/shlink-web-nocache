import { Action, Dispatch } from 'redux';
import { shortUrlMatches } from '../../short-urls/helpers';
import { Visit, VisitsInfo, VisitsLoadProgressChangedAction } from '../types';
import { ShortUrlIdentifier } from '../../short-urls/data';
import { buildActionCreator, buildReducer } from '../../utils/helpers/redux';
import { ShlinkApiClientBuilder } from '../../api/services/ShlinkApiClientBuilder';
import { GetState } from '../../container/types';
import { ShlinkVisitsParams } from '../../api/types';
import { ApiErrorAction } from '../../api/types/actions';
import { isBetween } from '../../utils/helpers/date';
import { getVisitsWithLoader } from './common';
import { CREATE_VISITS, CreateVisitsAction } from './visitCreation';

/* eslint-disable padding-line-between-statements */
export const GET_SHORT_URL_VISITS_START = 'shlink/shortUrlVisits/GET_SHORT_URL_VISITS_START';
export const GET_SHORT_URL_VISITS_ERROR = 'shlink/shortUrlVisits/GET_SHORT_URL_VISITS_ERROR';
export const GET_SHORT_URL_VISITS = 'shlink/shortUrlVisits/GET_SHORT_URL_VISITS';
export const GET_SHORT_URL_VISITS_LARGE = 'shlink/shortUrlVisits/GET_SHORT_URL_VISITS_LARGE';
export const GET_SHORT_URL_VISITS_CANCEL = 'shlink/shortUrlVisits/GET_SHORT_URL_VISITS_CANCEL';
export const GET_SHORT_URL_VISITS_PROGRESS_CHANGED = 'shlink/shortUrlVisits/GET_SHORT_URL_VISITS_PROGRESS_CHANGED';
/* eslint-enable padding-line-between-statements */

export interface ShortUrlVisits extends VisitsInfo, ShortUrlIdentifier {}

interface ShortUrlVisitsAction extends Action<string>, ShortUrlIdentifier {
  visits: Visit[];
  query?: ShlinkVisitsParams;
}

type ShortUrlVisitsCombinedAction = ShortUrlVisitsAction
& VisitsLoadProgressChangedAction
& CreateVisitsAction
& ApiErrorAction;

const initialState: ShortUrlVisits = {
  visits: [],
  shortCode: '',
  domain: undefined, // Deprecated. Value from query params can be used instead
  loading: false,
  loadingLarge: false,
  error: false,
  cancelLoad: false,
  progress: 0,
};

export default buildReducer<ShortUrlVisits, ShortUrlVisitsCombinedAction>({
  [GET_SHORT_URL_VISITS_START]: () => ({ ...initialState, loading: true }),
  [GET_SHORT_URL_VISITS_ERROR]: (_, { errorData }) => ({ ...initialState, error: true, errorData }),
  [GET_SHORT_URL_VISITS]: (_, { visits, query, shortCode, domain }) => ({
    ...initialState,
    visits,
    shortCode,
    domain,
    query,
  }),
  [GET_SHORT_URL_VISITS_LARGE]: (state) => ({ ...state, loadingLarge: true }),
  [GET_SHORT_URL_VISITS_CANCEL]: (state) => ({ ...state, cancelLoad: true }),
  [GET_SHORT_URL_VISITS_PROGRESS_CHANGED]: (state, { progress }) => ({ ...state, progress }),
  [CREATE_VISITS]: (state, { createdVisits }) => {
    const { shortCode, domain, visits, query = {} } = state;
    const { startDate, endDate } = query;
    const newVisits = createdVisits
      .filter(
        ({ shortUrl, visit }) =>
          shortUrl && shortUrlMatches(shortUrl, shortCode, domain) && isBetween(visit.date, startDate, endDate),
      )
      .map(({ visit }) => visit);

    return newVisits.length === 0 ? state : { ...state, visits: [ ...newVisits, ...visits ] };
  },
}, initialState);

export const getShortUrlVisits = (buildShlinkApiClient: ShlinkApiClientBuilder) => (
  shortCode: string,
  query: ShlinkVisitsParams = {},
) => async (dispatch: Dispatch, getState: GetState) => {
  const { getShortUrlVisits } = buildShlinkApiClient(getState);
  const visitsLoader = async (page: number, itemsPerPage: number) => getShortUrlVisits(
    shortCode,
    { ...query, page, itemsPerPage },
  );
  const shouldCancel = () => getState().shortUrlVisits.cancelLoad;
  const extraFinishActionData: Partial<ShortUrlVisitsAction> = { shortCode, query, domain: query.domain };
  const actionMap = {
    start: GET_SHORT_URL_VISITS_START,
    large: GET_SHORT_URL_VISITS_LARGE,
    finish: GET_SHORT_URL_VISITS,
    error: GET_SHORT_URL_VISITS_ERROR,
    progress: GET_SHORT_URL_VISITS_PROGRESS_CHANGED,
  };

  return getVisitsWithLoader(visitsLoader, extraFinishActionData, actionMap, dispatch, shouldCancel);
};

export const cancelGetShortUrlVisits = buildActionCreator(GET_SHORT_URL_VISITS_CANCEL);
