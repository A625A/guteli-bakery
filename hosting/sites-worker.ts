interface SitesAssets {
  fetch(request: Request): Promise<Response>;
}

interface SitesEnvironment {
  ASSETS: SitesAssets;
}

const worker = {
  fetch(request: Request, env: SitesEnvironment): Promise<Response> {
    return env.ASSETS.fetch(request);
  },
};

export default worker;
