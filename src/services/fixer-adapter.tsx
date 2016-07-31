import 'whatwg-fetch';
import { checkStatus } from './utils';
// import { CommentPanelModel, Comment } from '../stores/app-store';

// Get the latest foreign exchange reference rates in JSON format.

const FIXER_SERVICE_URL = 'https://api.fixer.io/';


// http://api.fixer.io/latest
const byLatest = (base?: string) => FIXER_SERVICE_URL
  + 'latest'
  + (base ? '?base=' + base : '');

// http://api.fixer.io/2000-01-03
const byDate = (date: Date, base?: string) => FIXER_SERVICE_URL
  + date.toISOString().slice(0, 10)
  + (base ? '?base=' + base : '');

export async function getLatest(base?): Promise<IFixerServiceResponse> {
  let json: Promise<IFixerServiceResponse>;

  try {
    let response = await fetch(byLatest(base));
    response = checkStatus(response);
    json = response.json();
  } catch (err) {
    console.log('request failed', err);
  }

  return json;
}

export async function getByDate(date: Date, base?): Promise<IFixerServiceResponse> {
  let json: Promise<IFixerServiceResponse>;

  try {
    let response = await fetch(byDate(date, base));
    response = checkStatus(response);
    json = response.json();
  } catch (err) {
    console.log('request failed', err);
  }

  return json;
}
