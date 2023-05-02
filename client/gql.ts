import { gql } from "@apollo/client";

const pinboardReturnFields = `
  composerId
  id
  status
  title
  headline
  trashed
  isNotFound
`;
export const gqlListPinboards = gql`
    query MyQuery($searchText: String!) {
        listPinboards(searchText: $searchText) { ${pinboardReturnFields} }
    }
`;
export const gqlGetPinboardByComposerId = gql`
    query MyQuery($composerId: String!) {
        getPinboardByComposerId(composerId: $composerId) { ${pinboardReturnFields} }
    }
`;
export const gqlGetPinboardsByIds = gql`
    query MyQuery($ids: [String!]!) {
        getPinboardsByIds(ids: $ids) { ${pinboardReturnFields} }
    }
`;
export const gqlGetGroupPinboardIds = gql`
  query MyQuery {
    getGroupPinboardIds {
      pinboardId
      unclaimedCount
      yourClaimedCount
      othersClaimedCount
      notClaimableCount
      latestGroupMentionItemId
      hasUnread
    }
  }
`;
export const gqlGetItemCounts = gql`
  query MyQuery($pinboardIds: [String!]!) {
    getItemCounts(pinboardIds: $pinboardIds) {
      pinboardId
      totalCount
      unreadCount
    }
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
  mentions {
    label
    isMe
  }
  groupMentions {
    label
    isMe
  }
  claimedByEmail
  claimable
  relatedItemId
  editHistory
  deletedAt
`;

// TODO: consider updating the resolver (cdk/stack.ts) to use a Query with a secondary index (if performance degrades when we have lots of items)
export const gqlGetInitialItems = (pinboardId: string) => gql`
    query MyQuery {
        listItems(pinboardId: "${pinboardId}") {
            ${itemReturnFields}
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
export const gqlEditItem = gql`
    mutation EditItem($itemId: String!, $input: EditItemInput!) {
        editItem(itemId: $itemId, input: $input) {
            # including fields here makes them accessible in our subscription data
            ${itemReturnFields}
        }
    }
`;
export const gqlDeleteItem = gql`
    mutation DeleteItem($itemId: String!) {
        deleteItem(itemId: $itemId) {
            # including fields here makes them accessible in our subscription data
            ${itemReturnFields}
        }
    }
`;
export const gqlOnMutateItem = (pinboardId: string) => gql`
    subscription OnMutateItem {
        onMutateItem(pinboardId: "${pinboardId}") { ${itemReturnFields} }
    }
`;

const userReturnFields = `
  email
  firstName
  lastName
  avatarUrl
`;

const myUserReturnFields = `${userReturnFields}
  hasWebPushSubscription
  manuallyOpenedPinboardIds
`;

export const gqlSearchMentionableUsers = (prefix: string) => gql`
    query MyQuery {
        searchMentionableUsers(prefix: "${prefix}") {
            users {
                ${userReturnFields}
                isMentionable
            }
            groups {
                shorthand
                name
                memberEmails
            }
        }
    }
`;

export const gqlGetUsers = gql`
    query MyQuery($emails: [String!]!) {
        getUsers(emails: $emails) {
            ${userReturnFields}
            isMentionable
        }
    }
`;

export const gqlGetMyUser = gql`
    query MyQuery {
        getMyUser {
            ${myUserReturnFields}
        }
    }
`;

export const gqlSetWebPushSubscriptionForUser = gql`
    mutation SetWebPushSubscriptionForUser($webPushSubscription: AWSJSON) {
        setWebPushSubscriptionForUser(webPushSubscription: $webPushSubscription) {
            ${myUserReturnFields}
        }
    }
`;

export const gqlAddManuallyOpenedPinboardIds = gql`
    mutation AddManuallyOpenedPinboardIds($pinboardId: String!, $maybeEmailOverride: String) {
        addManuallyOpenedPinboardIds(pinboardId: $pinboardId, maybeEmailOverride: $maybeEmailOverride) {
            # including fields here makes them accessible in our subscription data
            ${myUserReturnFields}
        }
    }
`;
export const gqlRemoveManuallyOpenedPinboardIds = gql`
    mutation RemoveManuallyOpenedPinboardIds($pinboardIdToClose: String!) {
        removeManuallyOpenedPinboardIds(pinboardIdToClose: $pinboardIdToClose) {
            # including fields here makes them accessible in our subscription data
            ${myUserReturnFields}
        }
    }
`;

export const gqlOnManuallyOpenedPinboardIdsChanged = (userEmail: string) => gql`
    subscription OnManuallyOpenedPinboardIdsChanged {
        onManuallyOpenedPinboardIdsChanged(email: "${userEmail}") {
            ${myUserReturnFields}
        }
    }
`;

const lastItemSeenByUserReturnFields = `
  pinboardId
  userEmail
  itemID
  seenAt    
`;

export const gqlGetLastItemSeenByUsers = (pinboardId: string) => gql`
    query MyQuery {
        listLastItemSeenByUsers(pinboardId: "${pinboardId}") {
            ${lastItemSeenByUserReturnFields}
        }
    }
`;

export const gqlOnSeenItem = (pinboardId: string) => gql`
    subscription OnSeenItem {
        onSeenItem(pinboardId: "${pinboardId}") { ${lastItemSeenByUserReturnFields} }
    }
`;

export const gqlSeenItem = gql`
    mutation SeeItem($input: LastItemSeenByUserInput!) {
        seenItem(input: $input) {
            # including fields here makes them accessible in our subscription data
            ${lastItemSeenByUserReturnFields}
        }
    }
`;

const claimedReturnFields = `
  pinboardId
  updatedItem {
    ${itemReturnFields}
  }
  newItem {
    ${itemReturnFields}
  }
`;

export const gqlClaimItem = gql`
    mutation ClaimItem($itemId: String!) {
        claimItem(itemId: $itemId) {
            ${claimedReturnFields}
        }
    }
`;

export const gqlOnClaimItem = (pinboardId: string) => gql`
    subscription OnClaimItem {
        onClaimItem(pinboardId: "${pinboardId}") { ${claimedReturnFields} }
    }
`;

const gridBadgeFields = `
  text
  color
`;

export const gqlGetGridSearchSummary = gql`
    query MyQuery($apiUrl: String!) {
        getGridSearchSummary(apiUrl: $apiUrl) {
            total
            thumbnails
            queryBreakdown {
                collections { ${gridBadgeFields} }
                labels { ${gridBadgeFields} }
                chips { ${gridBadgeFields} }
                restOfSearch
            }
        }
    }
`;

export const gqlAsGridPayload = (gridUrl: string) => gql`
    query AsGridPayload {
        asGridPayload(gridUrl: "${gridUrl}")
    }
`;

export const gqlAddCompletedTourStep = gql`
    mutation AddCompletedTourStep($tourStepId: String!) {
        addCompletedTourStep(tourStepId: $tourStepId) {
            ${myUserReturnFields}
        }
    }
`;
