import isEmpty from 'is-empty';

type DataTypeKeyT = 'json' | 'text' | 'blob' | 'formData';
type ResponseProcessorType = (response: Response) => Promise<any>;

type ServiceOutputErrorT = Error | AnyObjectT | null;
type ServiceOutputResultT = Response | AnyObjectT | null;
type ServiceOutputDataT = AnyObjectT | null;
type ServiceOutputT = { error: ServiceOutputErrorT; data: ServiceOutputDataT; response: ServiceOutputResultT };

type CreateUrlOptionsT = {
  baseUrl: string;
  path: string;
  query?: Record<string, string | number | boolean>;
};

type OptionsT = {
  name: string;
  baseUrl: string;
  path: string;
  usesAccessToken: boolean;
  usesIdToken: boolean;
  acceptType: DataTypeKeyT;
  contentType: DataTypeKeyT;
  method: string;
  prefer?: string;
};

type InputT =
  | AnyObjectT
  | {
      body?: AnyObjectT;
      query?: AnyObjectT;
    };

type CreateRequestOptionsT = {
  headers: Headers;
  method: string;
  url: string;
  body?: string | undefined;
};

const STRING_OPTIONS_MAP = {
  json: 'application/json',
  text: 'text/plain',
  blob: 'application/octet-stream',
  formData: 'multipart/form-data',
};

const RESPONSE_PROCESSORS: Record<DataTypeKeyT, ResponseProcessorType> = {
  json: (response: Response) => response.json(),
  text: (response: Response) => response.text(),
  blob: (response: Response) => response.blob(),
  formData: (response: Response) => response.formData(),
};

// No matter what endpoint or service we are calling,
// we always want to send bearer token and id token
// if the user is logged in.
const createHeaders = (options: OptionsT, input: InputT) => {
  const accessToken = sessionStorage.getItem('accessToken');
  const idToken = sessionStorage.getItem('idToken');
  const contentType = STRING_OPTIONS_MAP[options.contentType];
  const acceptType = STRING_OPTIONS_MAP[options.acceptType];

  const headers = new Headers();
  headers.append('Content-Type', options.method === 'get' ? 'x-www-form-urlencoded' : contentType);
  headers.append('Accept', acceptType);

  if (accessToken) {
    headers.append('Authorization', `Bearer ${accessToken}`);
    headers.append('x-id-token', idToken);
  }

  if (options.prefer) {
    const prefer = handlePreferHeader(options.prefer, input.query);
    headers.append('Prefer', prefer);
  }

  return headers;
};

const createBody = (input: InputT) => {
  return isEmpty(input.body) ? undefined : JSON.stringify(input.body);
};

const createRequest = (configuration: CreateRequestOptionsT) => {
  const requestOptions: RequestInit = {
    method: configuration.method,
    headers: configuration.headers,
  };

  // We don't want to send an empty body.
  if (configuration.body) requestOptions.body = configuration.body;
  const request = new Request(configuration.url, requestOptions);
  return request;
};

// Just to ensure that all options are filled out.
// This is kind of to appease the TypeScript gods.
const prepareOptions = (options: OptionsT): OptionsT => {
  const preparedOptions = {
    name: options.name,
    path: options.path || '',
    baseUrl: options.baseUrl || process.env.AUTH_URL,
    usesAccessToken: options.usesAccessToken || true,
    usesIdToken: options.usesIdToken || true,
    acceptType: options.acceptType || 'json',
    contentType: options.contentType || 'json',
    method: options.method || 'POST',
  };

  return preparedOptions;
};

const getResponseProcessor = (options: OptionsT): ResponseProcessorType => {
  return RESPONSE_PROCESSORS[options.acceptType];
};

const encodeQuery = (entries: [string, string | number | boolean][]): string[][] => {
  return entries.map(([key, value]) => {
    return [key, encodeURIComponent(String(value))];
  });
};

const handlePreferHeader = (value: string, query: AnyObjectT): string => {
  return value.replace(/{(\w+)}/g, (_, key: string) => {
    return query[key] as string;
  });
};

const injectVariable = (target: string, key: string, value: string) => {
  return target.replace(`{${key}}`, value);
};

const handleQueryPiece = (final: string, [key, value]: string[]): string => {
  const hasPieceMatch = final.match(`{${key}}`);
  const queryString = `${final}&${key}=${value}`;
  return hasPieceMatch ? injectVariable(final, key, value) : queryString;
};

export const createUrl = (options: CreateUrlOptionsT, input: InputT): string => {
  const initialUrl = options.baseUrl + options.path;
  const queryEntries = Object.entries(input.query);
  const encodedQueryEntries = encodeQuery(queryEntries);

  // If the url contains `{KEY}`, replace it with `${query[KEY]]}`.
  // If the url does not contain `{KEY}`, append `&KEY=${query[KEY]}`.
  const finalUrl = encodedQueryEntries.reduce(handleQueryPiece, initialUrl);

  // Replace the first "&" with "?". This is a simple way around having
  /// to maintain extra logic to see whether or not the url ends with
  // a '?', contains a '?', already has a query, etc, etc, etc.
  return finalUrl;
};

const prepareInput = (options: OptionsT, input: InputT): InputT => {
  // PR TODO: explain this
  if (!input.body && !input.query) {
    const [query, body] = options.method === 'GET' ? [input, {}] : [{}, input];

    return {
      query,
      body,
    };
  }

  return {
    body: input.body || {},
    query: input.query || {},
  };
};

const createServiceCall = (options: OptionsT) => {
  const preparedOptions = prepareOptions(options);

  return async (input: InputT) => {
    const preparedInput = prepareInput(preparedOptions, input);
    const headers = createHeaders(preparedOptions, preparedInput);
    const url = createUrl(preparedOptions, preparedInput);
    const body = createBody(preparedInput);

    const requestOptions = {
      method: preparedOptions.method,
      url,
      headers,
      body,
    };

    const request = createRequest(requestOptions);
    const response = await fetch(request);
    const processor = getResponseProcessor(preparedOptions);
    const output = (await processor(response)) as AnyObjectT;

    // If we get an error status code, we know that whatever we
    // parsed into output^ is actually an error object. Similarly,
    // if we get a success status code, we know that whatever we
    // parsed into output^ is actually the success data we want.
    const error = response.status > 399 ? output : null;
    const data = response.status < 400 ? output : null;

    return { error, data, response };
  };
};

// This is the function that we will use to create a service.
// It will return a function that we can call to make the request,
// and that will use the configuration we provide to make the request.
// It returns a simple interface of [error, data]. If there is an error,
// the data will be null. If there is no error, the error will be null.
export const createService = (options: OptionsT) => {
  const serviceCall = createServiceCall(options);

  return async (input: InputT): Promise<ServiceOutputT> => {
    console.log(`🤙🏽 calling ${options.name}`, { input, options });
    const request = await serviceCall(input);
    console.assert(!request.error, '\n\n📞❌ Http request error: ', request.error, '\n\n');
    return request;
  };
};
