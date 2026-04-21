// pages/api/graphql.js
// Single GraphQL endpoint — replaces all individual REST API routes
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { typeDefs } from '../../lib/graphql/schema.js';
import { resolvers } from '../../lib/graphql/resolvers.js';
import { getUserFromRequest } from '../../lib/auth.js';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  // Show stack traces in dev only
  includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
});

const handler = startServerAndCreateNextHandler(server, {
  // Attach the authenticated user to every request's context
  context: async (req) => {
    const user = getUserFromRequest(req);
    return { user };
  },
});

export default handler;
