// pages/api/graphql.js
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { typeDefs } from '../../lib/graphql/schema.js';
import { resolvers } from '../../lib/graphql/resolvers.js';
import { getUserFromRequest } from '../../lib/auth.js';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({ embed: true }),
  ],
});

export default startServerAndCreateNextHandler(server, {
  context: async (req) => {
    const user = getUserFromRequest(req);
    return { user };
  },
});

// Do NOT disable bodyParser — @as-integrations/next v3 needs Next.js to parse the body
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};