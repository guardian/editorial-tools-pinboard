import { ApolloError, useMutation } from "@apollo/client";
import { css } from "@emotion/react";
import { palette, space } from "@guardian/source-foundations";
import React, { useContext, useState } from "react";
import { Group, Item, User } from "../../shared/graphql/graphql";
import { gqlCreateItem } from "../gql";
import { CreateItemInputBox } from "./createItemInputBox";
import { PayloadAndType } from "./types/PayloadAndType";
import { PendingItem } from "./types/PendingItem";
import { groupToMentionHandle, userToMentionHandle } from "./util";
import { composer } from "../colours";
import SendArrow from "../icons/send.svg";
import { buttonBackground } from "./styling";
import { TelemetryContext, PINBOARD_TELEMETRY_TYPE } from "./types/Telemetry";
import { SvgSpinner } from "@guardian/source-react-components";
import { isGroup, isUser } from "../../shared/graphql/extraTypes";

interface SendMessageAreaProps {
  payloadToBeSent: PayloadAndType | null;
  clearPayloadToBeSent: () => void;
  onSuccessfulSend: (item: PendingItem, mentionEmails: string[]) => void;
  onError: (error: ApolloError) => void;
  userEmail: string;
  pinboardId: string;
  panelElement: HTMLDivElement | null;
}

export const SendMessageArea = ({
  payloadToBeSent,
  clearPayloadToBeSent,
  onSuccessfulSend,
  onError,
  pinboardId,
  panelElement,
}: SendMessageAreaProps) => {
  const [message, setMessage] = useState<string>("");
  const [unverifiedMentions, setUnverifiedMentions] = useState<
    Array<User | Group>
  >([]);
  const addUnverifiedMention = (userOrGroup: User | Group) =>
    setUnverifiedMentions((prevState) => [...prevState, userOrGroup]); // TODO: also make user unique in list

  const verifiedIndividualMentionEmails = Array.from(
    new Set(
      unverifiedMentions
        .filter(isUser)
        .filter((user) => message.includes(userToMentionHandle(user)))
        .map((user) => user.email)
    )
  );

  const verifiedGroupMentionShorthands = Array.from(
    new Set(
      unverifiedMentions
        .filter(isGroup)
        .filter((group) => message.includes(groupToMentionHandle(group)))
        .map((group) => group.shorthand)
    )
  );

  const sendTelemetryEvent = useContext(TelemetryContext);

  const hasGridUrl = (message: string) => {
    const gridUrlRegex = /https:\/\/media.gutools.co.uk/;
    return !!message.match(gridUrlRegex);
  };

  const [_sendItem, { loading: isItemSending }] = useMutation<{
    createItem: Item;
  }>(gqlCreateItem, {
    onCompleted: (sendMessageResult) => {
      onSuccessfulSend(
        {
          ...sendMessageResult.createItem,
          pending: true,
        },
        verifiedIndividualMentionEmails
      );
      if (hasGridUrl(message)) {
        sendTelemetryEvent?.(PINBOARD_TELEMETRY_TYPE.GRID_LINK_PASTED);
      }
      sendTelemetryEvent?.(PINBOARD_TELEMETRY_TYPE.MESSAGE_SENT, {
        pinboardId: sendMessageResult.createItem.pinboardId,
        messageType: payloadToBeSent?.type || "message-only",
        hasMentions:
          !!verifiedIndividualMentionEmails.length ||
          !!verifiedGroupMentionShorthands.length,
      });
      setMessage("");
      clearPayloadToBeSent();
      setUnverifiedMentions([]);
    },
    onError,
  });
  const sendItem = () =>
    _sendItem({
      variables: {
        input: {
          type: payloadToBeSent?.type || "message-only",
          message,
          payload: payloadToBeSent && JSON.stringify(payloadToBeSent.payload),
          pinboardId,
          mentions: verifiedIndividualMentionEmails,
          groupMentions: verifiedGroupMentionShorthands,
          claimable:
            verifiedGroupMentionShorthands?.length > 0 &&
            window.confirm(
              "It looks like you're mentioning a group. If this is a request to the team, would you like to be claimable?"
            ),
        },
      },
    });

  return (
    <div
      css={css`
        display: flex;
        border-top: 1px solid ${palette.neutral[46]};
        &:focus-within {
          border-top-color: ${composer.primary[300]};
        }
        padding: ${space[2]}px;
      `}
    >
      <CreateItemInputBox
        payloadToBeSent={payloadToBeSent}
        clearPayloadToBeSent={clearPayloadToBeSent}
        message={message}
        setMessage={setMessage}
        sendItem={sendItem}
        addUnverifiedMention={addUnverifiedMention}
        panelElement={panelElement}
        isSending={isItemSending}
      />
      <button
        css={css`
          margin-left: ${space[2]}px;
          align-self: end;
          fill: ${composer.primary[300]};
          background: none;
          border: none;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 0;

          ${buttonBackground(palette.neutral[86])}
          &:disabled {
            fill: ${palette.neutral[46]};
            background-color: initial;

            box-shadow: none;
            cursor: default;
          }
        `}
        onClick={sendItem}
        disabled={isItemSending || !(message || payloadToBeSent)}
      >
        {isItemSending ? (
          <SvgSpinner />
        ) : (
          <SendArrow
            css={css`
              width: 18px;
              height: 16px;
            `}
          />
        )}
      </button>
    </div>
  );
};
