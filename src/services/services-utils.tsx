export function validateStatusCode(response) {
  if (response.status >= 200 && response.status < 300) {
    return true;
  } else {
    throw new Error(response.statusText);
  }
}

export function logRejection(err) {
  console.log('Request Failed:', err);
};
