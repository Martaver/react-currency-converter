import 'whatwg-fetch';
import { checkStatus } from './utils';
// import { CommentPanelModel, Comment } from '../stores/app-store';

// Get the latest foreign exchange reference rates in JSON format.

const FIXER_SERVICE_URL = 'https://api.fixer.io/';


// http://api.fixer.io/latest
const byLatest = () => FIXER_SERVICE_URL + 'latest';

// http://api.fixer.io/2000-01-03
const byDate = (date: Date) => FIXER_SERVICE_URL + `${date.getFullYear()}-${date.getMonth()}-${date.getDay()}`;

export async function getLatest(): Promise<IFixerServiceResponse> {
  let json: Promise<IFixerServiceResponse>;

  try {
    let response = await fetch(byLatest());
    response = checkStatus(response);
    json = response.json();
  } catch (err) {
    console.log('request failed', err);
  }

  return json;
}

export async function getByDate(date: Date): Promise<IFixerServiceResponse> {
  let json: Promise<IFixerServiceResponse>;

  try {
    let response = await fetch(byDate(date));
    response = checkStatus(response);
    json = response.json();
  } catch (err) {
    console.log('request failed', err);
  }

  return json;
}
