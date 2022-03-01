import React, { useState } from "react";
import { useQuery } from "@apollo/client";
import { css } from "@emotion/react";
import type { PinboardData } from "./pinboard";
import { standardPanelContainerCss } from "./styling";
import { PayloadDisplay } from "./payloadDisplay";
import { pinboardSecondaryPastel, pinMetal } from "../colours";
import { space } from "@guardian/source-foundations";
import { gqlListPinboards } from "../gql";
import { PushNotificationPreferencesOpener } from "./pushNotificationPreferences";
import { useGlobalStateContext } from "./globalState";

export const SelectPinboard: React.FC = () => {
  const {
    activePinboardIds,
    payloadToBeSent,
    clearPayloadToBeSent,

    openPinboard,
    closePinboard,
    preselectedPinboard,

    hasWebPushSubscription,

    errors,

    unreadFlags,
  } = useGlobalStateContext();

  const [searchText, setSearchText] = useState<string>("");

  const { data, loading } = useQuery<{ listPinboards: PinboardData[] }>(
    gqlListPinboards
  );

  const allPinboards = [...(data?.listPinboards || [])].sort(
    (a, b) => (unreadFlags[a.id] ? -1 : unreadFlags[b.id] ? 1 : 0) // pinboards with unread to the top
  );

  const OpenPinboardButton = (pinboardData: PinboardData) => (
    <div
      css={css`
        display: flex;
        margin-bottom: 2px;
      `}
      key={pinboardData.id}
    >
      <button
        css={css`
          text-align: left;
          background-color: white;
          flex-grow: 1;
          color: #131212;
        `}
        onClick={() => openPinboard(pinboardData)}
      >
        {unreadFlags[pinboardData.id] && "🔴 "}
        {activePinboardIds.includes(pinboardData.id) &&
          errors[pinboardData.id] &&
          "⚠️ "}
        {pinboardData.title}
      </button>
      {activePinboardIds.includes(pinboardData.id) && !preselectedPinboard && (
        <button onClick={() => closePinboard(pinboardData.id)}>❌</button>
      )}
    </div>
  );

  return (
    <>
      <div css={standardPanelContainerCss}>
        {payloadToBeSent && (
          <div
            css={css`
              width: 150px;
              position: absolute;
              top: ${space[5]}px;
              left: -180px;
              background-color: ${pinboardSecondaryPastel};
              padding: ${space[3]}px;
              text-align: center;
              border-radius: ${space[2]}px;
              color: ${pinMetal};
            `}
          >
            <p
              css={css`
                margin-top: 0;
              `}
            >
              Choose the pinboard for this asset 👉
            </p>

            <PayloadDisplay
              {...payloadToBeSent}
              clearPayloadToBeSent={clearPayloadToBeSent}
            />
          </div>
        )}
        {!hasWebPushSubscription && (
          /* TODO move this and the one at the bottom of the file to floaty */
          <PushNotificationPreferencesOpener
            hasWebPushSubscription={hasWebPushSubscription}
          />
        )}
        {loading && <p>Loading pinboards...</p>}
        <h4>
          {preselectedPinboard
            ? `Pinboard associated with this piece`
            : `Active pinboards`}
        </h4>
        {data &&
          allPinboards
            .filter((pinboardData: PinboardData) =>
              activePinboardIds.includes(pinboardData.id)
            )
            .map(OpenPinboardButton)}
        <h4>Open a pinboard</h4>
        {data && (
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search for a Pinboard..."
            css={{
              marginBottom: "5px",
              boxSizing: "border-box",
              width: "100%",
            }}
          />
        )}
        {data &&
          allPinboards
            .filter(
              (pinboardData: PinboardData) =>
                !activePinboardIds.includes(pinboardData.id) &&
                pinboardData.title
                  ?.toLowerCase()
                  .includes(searchText?.toLowerCase())
            )
            .map(OpenPinboardButton)}
        {hasWebPushSubscription && (
          /* TODO move this to some settings menu (rather than bottom of selection list) */
          <PushNotificationPreferencesOpener
            hasWebPushSubscription={hasWebPushSubscription}
          />
        )}
      </div>
    </>
  );
};
