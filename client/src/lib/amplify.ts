import { Amplify } from 'aws-amplify';

const amplifyConfig = {
  Auth: {
    region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
    userPoolId: import.meta.env.VITE_USER_POOL_ID,
    userPoolWebClientId: import.meta.env.VITE_USER_POOL_WEB_CLIENT_ID,
  },
  API: {
    aws_appsync_graphqlEndpoint: import.meta.env.VITE_APPSYNC_GRAPHQL_ENDPOINT,
    aws_appsync_region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
    aws_appsync_authenticationType: 'AMAZON_COGNITO_USER_POOLS',
  },
};

export default amplifyConfig;
