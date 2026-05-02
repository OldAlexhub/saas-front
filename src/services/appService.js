import API from './api';

export const getAppInfo = () => API.get('/app/info');

export function getApkDownloadUrl() {
  const base = process.env.REACT_APP_API_BASE_URL || '/api/v1';
  const normalized = base.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(normalized)) {
    return `${normalized}/app/apk`;
  }
  return `${window.location.origin}${normalized}/app/apk`;
}
