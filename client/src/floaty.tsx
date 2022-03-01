import { ApolloError, useLazyQuery, useSubscription } from "@apollo/client";
import { css } from "@emotion/react";
import React, { useEffect, useRef, useState } from "react";
import { NotTrackedInWorkflow } from "./notTrackedInWorkflow";
import { pinMetal, pinboard, composer } from "../colours";
import { Pinboard, PinboardData } from "./pinboard";
import { SelectPinboard } from "./selectPinboard";
import PinIcon from "../icons/pin-icon.svg";
import { palette, space } from "@guardian/source-foundations";
import { PayloadAndType } from "./types/PayloadAndType";
import { gqlGetPinboardByComposerId, gqlOnCreateItem } from "../gql";
import { agateSans } from "../fontNormaliser";
import { Item, User } from "../../shared/graphql/graphql";
import root from "react-shadow/emotion";
import { EXPAND_PINBOARD_QUERY_PARAM } from "./app";

const bottom = 108;
const right = 15;
const floatySize = 40;
const boxShadow =
  "rgba(0, 0, 0, 0.14) 0px 0px 4px, rgba(0, 0, 0, 0.28) 0px 4px 8px";
export const standardFloatyContainerCss = css`
  overflow-y: auto;
  margin: ${space[1]}px;
  h4 {
    color: black;
  }
`;

interface FloatyNotificationsBubbleProps {
  presetUnreadNotifications: number | undefined;
}
const FloatyNotificationsBubble = ({
  presetUnreadNotifications,
}: FloatyNotificationsBubbleProps) => (
  <div
    css={css`
      position: absolute;
      top: -3px;
      left: 26px;
      user-select: none;
      background-color: ${composer.warning[300]};
      min-width: ${space[4]}px;
      height: ${space[4]}px;
      border-radius: 12px;
      ${agateSans.xxsmall()};
      color: ${palette.neutral[100]};
      text-align: center;
    `}
  >
    <span
      css={css`
        margin: 0 4px;
        height: 100%;
        display: inline-block;
        vertical-align: middle;
        line-height: 12px;
      `}
    >
      {presetUnreadNotifications || ""}
    </span>
  </div>
);

export type PerPinboard<T> = {
  [pinboardId: string]: T | undefined;
};
export interface FloatyProps {
  userEmail: string;
  preselectedComposerId: string | null | undefined;
  presetUnreadNotifications: number | undefined;
  payloadToBeSent: PayloadAndType | null;
  clearPayloadToBeSent: () => void;
  isExpanded: boolean;
  setIsExpanded: (_: boolean) => void;
  userLookup: { [email: string]: User } | undefined;
  hasWebPushSubscription: boolean | null | undefined;
  showNotification: (item: Item) => void;
  clearDesktopNotificationsForPinboardId: (pinboardId: string) => void;
}

export const Floaty = (props: FloatyProps) => {
  const { isExpanded, setIsExpanded } = props;

  const [manuallyOpenedPinboards, setManuallyOpenedPinboards] = useState<
    PinboardData[]
  >([]);

  const [getPreselectedPinboard, preselectedPinboardQuery] = useLazyQuery(
    gqlGetPinboardByComposerId
  );
  useEffect(() => {
    props.preselectedComposerId &&
      getPreselectedPinboard({
        variables: {
          composerId: props.preselectedComposerId,
        },
      });
  }, [props.preselectedComposerId]);

  const preselectedPinboard: PinboardData | undefined =
    props.preselectedComposerId &&
    preselectedPinboardQuery.data?.getPinboardByComposerId;

  const activePinboards: PinboardData[] = preselectedPinboard
    ? [preselectedPinboard]
    : manuallyOpenedPinboards;

  const activePinboardIds = activePinboards.map((_) => _.id);

  const [selectedPinboardId, setSelectedPinboardId] = useState<string | null>();

  useEffect(() => setSelectedPinboardId(preselectedPinboard?.id), [
    preselectedPinboard,
  ]);

  const clearSelectedPinboard = () => setSelectedPinboardId(null);

  const openPinboard = (pinboardData: PinboardData) => {
    const hostname = window.location.hostname;
    const composerDomain =
      hostname.includes(".local.") ||
      hostname.includes(".code.") ||
      hostname.includes(".test.")
        ? "code.dev-gutools.co.uk"
        : "gutools.co.uk";
    const composerUrl = `https://composer.${composerDomain}/content/${
      pinboardData.composerId || ".."
    }?${EXPAND_PINBOARD_QUERY_PARAM}=true`;
    if (!activePinboardIds.includes(pinboardData.id)) {
      preselectedPinboard
        ? window?.open(composerUrl, "_blank")?.focus()
        : setManuallyOpenedPinboards([
            ...manuallyOpenedPinboards,
            pinboardData,
          ]);
    }

    if (!preselectedPinboard || preselectedPinboard.id === pinboardData.id) {
      setSelectedPinboardId(pinboardData.id);
    }
  };

  const [errors, setErrors] = useState<PerPinboard<ApolloError>>({});

  const setError = (pinboardId: string, error: ApolloError | undefined) =>
    setErrors((prevErrors) => ({ ...prevErrors, [pinboardId]: error }));

  const hasError = Object.entries(errors).find(
    ([pinboardId, error]) => activePinboardIds.includes(pinboardId) && error
  );

  const [unreadFlags, setUnreadFlags] = useState<PerPinboard<boolean>>({});

  const setUnreadFlag = (pinboardId: string) => (
    unreadFlag: boolean | undefined
  ) => {
    setUnreadFlags((prevUnreadFlags) => ({
      ...prevUnreadFlags,
      [pinboardId]: unreadFlag,
    }));
    !unreadFlag && props.clearDesktopNotificationsForPinboardId(pinboardId);
  };

  const hasUnread = Object.values(unreadFlags).find((unreadFlag) => unreadFlag);

  const closePinboard = (pinboardIdToClose: string) => {
    if (activePinboardIds.includes(pinboardIdToClose)) {
      setManuallyOpenedPinboards([
        ...manuallyOpenedPinboards.filter(
          (pinboard) => pinboard.id !== pinboardIdToClose
        ),
      ]);
    }
    setSelectedPinboardId(null);
    setUnreadFlag(pinboardIdToClose)(undefined);
    setError(pinboardIdToClose, undefined);
  };

  useSubscription(gqlOnCreateItem(), {
    onSubscriptionData: ({ subscriptionData }) => {
      const { pinboardId, mentions } = subscriptionData.data.onCreateItem;

      const isMentioned = mentions.includes(props.userEmail); // TODO also check group membership here (once added)

      const pinboardIsOpen = isExpanded && selectedPinboardId === pinboardId;

      if (isMentioned && !pinboardIsOpen) {
        setUnreadFlag(pinboardId)(true);
      }
    },
  });

  const isNotTrackedInWorkflow =
    props.preselectedComposerId &&
    !preselectedPinboard &&
    !preselectedPinboardQuery.loading;

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (
        event.source !== window &&
        Object.prototype.hasOwnProperty.call(event.data, "item")
      ) {
        const item = event.data.item;
        window.focus();
        setIsExpanded(true);
        setSelectedPinboardId(item.pinboardId); // FIXME handle if said pinboard is not active (i.e. load data)
        // TODO ideally highlight the item
      }
    });
  }, []);

  const floatyRef = useRef<HTMLDivElement>(null);
  return (
    <root.div
      css={css`
        ${agateSans.small()}
        color: ${pinMetal};
      `}
    >
      <div
        css={css`
          position: fixed;
          z-index: 99999;
          bottom: ${bottom}px;
          right: ${right}px;
          width: ${floatySize}px;
          height: ${floatySize}px;
          border-radius: ${floatySize / 2}px;
          cursor: pointer;
          box-shadow: ${boxShadow};
          background-color: ${pinboard[500]};

          &:hover {
            background-color: ${pinboard[800]};
          }
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <PinIcon
          css={css`
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            height: 22px;
            width: 12px;
            path {
              stroke: ${pinMetal};
              stroke-width: 0.5px;
            }
          `}
        />
        {hasError && (
          <div
            css={css`
              position: absolute;
              font-size: ${floatySize / 4}px;
              bottom: -${floatySize / 16}px;
              right: 0px;
              user-select: none;
              text-shadow: 0 0 5px black;
            `}
          >
            ⚠️
          </div>
        )}
        {(props.presetUnreadNotifications !== undefined || hasUnread) && (
          <FloatyNotificationsBubble
            presetUnreadNotifications={props.presetUnreadNotifications}
          />
        )}
      </div>
      <div
        css={css`
          position: fixed;
          z-index: 99998;
          background: white;
          box-shadow: ${boxShadow};
          border: 2px ${pinboard[500]} solid;
          width: 250px;
          height: calc(100vh - 100px);
          bottom: ${bottom + floatySize / 2 - 5}px;
          right: ${right + floatySize / 2 - 5}px;
          display: ${isExpanded ? "flex" : "none"};
          flex-direction: column;
          justify-content: space-between;
          font-family: sans-serif;
        `}
        ref={floatyRef}
      >
        {isNotTrackedInWorkflow ? (
          <NotTrackedInWorkflow />
        ) : (
          !selectedPinboardId && (
            <SelectPinboard
              openPinboard={openPinboard}
              activePinboardIds={activePinboardIds}
              closePinboard={closePinboard}
              unreadFlags={unreadFlags}
              errors={errors}
              payloadToBeSent={props.payloadToBeSent}
              clearPayloadToBeSent={props.clearPayloadToBeSent}
              preselectedPinboard={preselectedPinboard}
              hasWebPushSubscription={props.hasWebPushSubscription}
            />
          )
        )}

        {
          // The active pinboards are always mounted, so that we receive new item notifications
          // Note that the pinboard hides itself based on 'isSelected' prop
          activePinboards.map((pinboardData) => (
            <Pinboard
              {...props}
              pinboardData={pinboardData}
              key={pinboardData.id}
              setError={setError}
              setUnreadFlag={setUnreadFlag(pinboardData.id)}
              hasUnreadOnOtherPinboard={
                !!hasUnread &&
                !!Object.entries(unreadFlags).find(
                  ([pinboardId, isUnread]) =>
                    isUnread && pinboardId !== pinboardData.id
                )
              }
              hasErrorOnOtherPinboard={
                !!hasError &&
                !!Object.entries(errors).find(
                  ([pinboardId, isError]) =>
                    isError && pinboardId !== pinboardData.id
                )
              }
              isExpanded={pinboardData.id === selectedPinboardId && isExpanded}
              isSelected={pinboardData.id === selectedPinboardId}
              clearSelectedPinboard={clearSelectedPinboard}
              floatyElement={floatyRef.current}
            />
          ))
        }
      </div>
    </root.div>
  );
};
