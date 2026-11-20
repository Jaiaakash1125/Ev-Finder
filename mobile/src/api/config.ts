export const DEFAULT_API_URL = "http://10.39.111.12/api/v1";

const rawUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (rawUrl && rawUrl.length > 0 ? rawUrl : DEFAULT_API_URL).replace(
  /\/+$/,
  ""
);

export const API_TIMEOUT_MS = 10000;
