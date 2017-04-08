import { isResponseStatusOk, logError, logDebug } from '../../utils/index';

// Get the latest foreign exchange reference rates in JSON format.
const FIXER_API_URL = 'https://api.fixer.io/';

// http://api.fixer.io/latest
export async function getLatest(baseCurrency?: string):
  Promise<IFixerServiceResponse | undefined> {
  let fixerLatestRates = FIXER_API_URL + 'latest';
  if (baseCurrency) {
    fixerLatestRates += '?base=' + baseCurrency;
  }

  try {
    const response = await fetch(fixerLatestRates);
    if (isResponseStatusOk(response)) {
      return response.json();
    } else {
      logDebug(response.body);
      return;
    }
  } catch (err) {
    logError(err);
    return;
  }
}

// http://api.fixer.io/2000-01-03
export async function getByDate(date: Date, baseCurrency?: string):
  Promise<IFixerServiceResponse | undefined> {
  // tslint:disable-next-line:no-magic-numbers
  let fixerRatesByDate = FIXER_API_URL + date.toISOString().slice(0, 10);
  if (baseCurrency) {
    fixerRatesByDate += '?base=' + baseCurrency;
  }

  try {
    const response = await fetch(fixerRatesByDate);
    if (isResponseStatusOk(response)) {
      return response.json();
    } else {
      logDebug(response.body);
      return;
    }
  } catch (err) {
    logError(err);
    return;
  }
}
