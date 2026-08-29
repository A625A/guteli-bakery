export type PublicError = Readonly<{
  code: string;
  message: string;
  requestId: string;
  fieldErrors?: Readonly<Record<string, string>>;
}>;

export function errorResponse(
  error: PublicError,
  status: number,
  retryAfterSeconds?: number,
) {
  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
        requestId: error.requestId,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      },
    },
    {
      status,
      headers: {
        'cache-control': 'no-store',
        'x-request-id': error.requestId,
        ...(retryAfterSeconds === undefined
          ? {}
          : { 'retry-after': String(retryAfterSeconds) }),
      },
    },
  );
}
