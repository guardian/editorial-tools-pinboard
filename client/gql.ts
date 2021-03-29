import { gql } from "@apollo/client";

const pinboardReturnFields = `
  composerId
  id
  status
  title
`;
export const gqlListPinboards = gql`
  query MyQuery {
    listPinboards { ${pinboardReturnFields} }
  }
`;
export const gqlGetPinboardByComposerId = gql`
  query MyQuery($composerId: String!) {
    getPinboardByComposerId(composerId: $composerId) { ${pinboardReturnFields} }
  }
`;

const itemReturnFields = `
  id
  type
  userEmail
  timestamp
  pinboardId
  message
  payload
  mentions
`;
const mentionReturnFields = `
  pinboardId
  mentions
`;
// TODO: consider updating the resolver (cdk/stack.ts) to use a Query with a secondary index (if performance degrades when we have lots of items)
export const gqlGetInitialItems = (pinboardId: string) => gql`
  query MyQuery {
    listItems(filter: { pinboardId: { eq: "${pinboardId}" } }) {
      items { ${itemReturnFields} }
    }
  }
`;
export const gqlCreateItem = gql`
  mutation SendMessage($input: CreateItemInput!) {
    createItem(input: $input) {
      # including fields here makes them accessible in our subscription data
      ${itemReturnFields}
    }
  }
`;
export const gqlOnCreateItem = (pinboardId?: string) =>
  pinboardId
    ? gql`
  subscription OnCreateItem {
    onCreateItem(pinboardId: "${pinboardId}") { ${itemReturnFields} }
  }
`
    : gql`
  subscription OnCreateItem {
    onCreateItem { ${mentionReturnFields} }
  }
`;

const userReturnFields = `
  email
  firstName
  lastName
  avatarUrl
`;

export const gqlGetAllUsers = gql`
query MyQuery {
  searchUsers {
    items { ${userReturnFields} }
  }
}
`;
