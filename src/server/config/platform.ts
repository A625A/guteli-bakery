/** Set by the operator in Functions scope; never infer trust from request headers. */
export function isNetlify(
  env: Record<string, string | undefined> = process.env,
) {
  return env.DEPLOYMENT_PLATFORM === 'netlify' || env.NETLIFY === 'true';
}
