import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import {
  Item,
  LastItemSeenByUser,
  WorkflowStub,
} from "../../shared/graphql/graphql";
import { ScrollableItems } from "./scrollableItems";
import { PendingItem } from "./types/PendingItem";
import {
  gqlGetInitialItems,
  gqlGetLastItemSeenByUsers,
  gqlOnCreateItem,
  gqlOnSeenItem,
} from "../gql";
import { SendMessageArea } from "./sendMessageArea";
import { useGlobalStateContext } from "./globalState";
import { css } from "@emotion/react";
import { palette } from "@guardian/source-foundations";

export type PinboardData = WorkflowStub;

export interface LastItemSeenByUserLookup {
  [userEmail: string]: LastItemSeenByUser;
}

interface PinboardProps {
  pinboardData: PinboardData;
  isExpanded: boolean;
  isSelected: boolean;
  panelElement: HTMLDivElement | null;
}

export const Pinboard: React.FC<PinboardProps> = ({
  pinboardData,
  isExpanded,
  isSelected,
  panelElement,
}) => {
  const {
    userEmail,
    userLookup,

    payloadToBeSent,
    clearPayloadToBeSent,

    showNotification,

    setError,

    setUnreadFlag,
  } = useGlobalStateContext();

  const pinboardId = pinboardData.id;

  // TODO: extract to floaty level?
  const itemSubscription = useSubscription(gqlOnCreateItem(pinboardId), {
    onSubscriptionData: ({ subscriptionData }) => {
      const updateForSubscription = subscriptionData.data.onCreateItem;
      setSubscriptionItems((prevState) => [
        ...prevState,
        updateForSubscription,
      ]);
      if (!isExpanded) {
        showNotification(updateForSubscription);
        setUnreadFlag(pinboardId)(true);
      }
    },
  });

  const [subscriptionItems, setSubscriptionItems] = useState<Item[]>([]);

  const [successfulSends, setSuccessfulSends] = useState<PendingItem[]>([]);

  const initialItems = useQuery(gqlGetInitialItems(pinboardId));

  const initialLastItemSeenByUsers = useQuery(
    gqlGetLastItemSeenByUsers(pinboardId)
  );

  const [
    lastItemSeenByUserLookup,
    setLastItemSeenByUserLookup,
  ] = useState<LastItemSeenByUserLookup>({});

  useSubscription(gqlOnSeenItem(pinboardId), {
    onSubscriptionData: ({ subscriptionData }) => {
      const newLastItemSeenByUser: LastItemSeenByUser =
        subscriptionData.data.onSeenItem;
      const previousLastItemSeenByUser =
        lastItemSeenByUserLookup[newLastItemSeenByUser.userEmail];
      if (
        !previousLastItemSeenByUser ||
        previousLastItemSeenByUser.seenAt < newLastItemSeenByUser.seenAt
      ) {
        setLastItemSeenByUserLookup((prevState) => ({
          ...prevState,
          [newLastItemSeenByUser.userEmail]: newLastItemSeenByUser,
        }));
      }
    },
  });

  useEffect(
    () =>
      initialLastItemSeenByUsers.data &&
      setLastItemSeenByUserLookup((prevState) =>
        initialLastItemSeenByUsers.data.listLastItemSeenByUsers.items.reduce(
          (
            acc: LastItemSeenByUserLookup,
            newLastItemSeenByUser: LastItemSeenByUser
          ) => {
            const previousLastItemSeenByUser =
              acc[newLastItemSeenByUser.userEmail];
            if (
              !previousLastItemSeenByUser ||
              previousLastItemSeenByUser.seenAt < newLastItemSeenByUser.seenAt
            ) {
              return {
                ...acc,
                [newLastItemSeenByUser.userEmail]: newLastItemSeenByUser,
              };
            }
            return acc;
          },
          prevState
        )
      ),
    [initialLastItemSeenByUsers.data]
  );

  useEffect(
    () => setError(pinboardId, initialItems.error || itemSubscription.error),
    [initialItems.error, itemSubscription.error]
  );

  return !isSelected ? null : (
    <React.Fragment>
      {initialItems.loading && "Loading..."}
      <div
        css={css`
          background-color: ${palette.opinion[500]};
          color: ${palette.neutral[100]};
        `}
      >
        {initialItems.error && `Error: ${initialItems.error}`}
        {itemSubscription.error && `Error: ${itemSubscription.error}`}
      </div>
      <div // push chat messages to bottom of panel if they do not fill
        css={css`
          flex-grow: 1;
        `}
      />
      {initialItems.data && (
        <ScrollableItems
          showNotification={showNotification}
          initialItems={initialItems.data.listItems.items}
          successfulSends={successfulSends}
          subscriptionItems={subscriptionItems}
          setUnreadFlag={setUnreadFlag(pinboardId)}
          isExpanded={isExpanded}
          userLookup={userLookup}
          userEmail={userEmail}
          pinboardId={pinboardId}
          lastItemSeenByUserLookup={lastItemSeenByUserLookup}
        />
      )}
      <SendMessageArea
        onSuccessfulSend={(pendingItem) =>
          setSuccessfulSends((previousSends) => [...previousSends, pendingItem])
        }
        payloadToBeSent={payloadToBeSent}
        clearPayloadToBeSent={clearPayloadToBeSent}
        allUsers={userLookup && Object.values(userLookup)}
        onError={(error) => setError(pinboardId, error)}
        userEmail={userEmail}
        pinboardId={pinboardId}
        panelElement={panelElement}
      />
    </React.Fragment>
  );
};
