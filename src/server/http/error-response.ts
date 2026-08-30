export type PublicError<Code extends string = string> = Readonly<{
  code: Code;
  message: string;
  requestId: string;
  fieldErrors?: Readonly<Record<string, string>>;
}>;

export function errorResponse<Code extends string>(
  error: PublicError<Code>,
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
