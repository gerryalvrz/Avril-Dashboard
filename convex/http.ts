import { httpRouter } from 'convex/server';
import { updateDeploymentFromWebhook } from './deployments';

const http = httpRouter();

http.route({
  path: '/webhooks/deployer',
  method: 'POST',
  handler: updateDeploymentFromWebhook,
});

export default http;
