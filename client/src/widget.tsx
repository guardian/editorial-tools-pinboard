/** @jsx jsx */
import { ApolloError, gql, useQuery } from "@apollo/client";
import { css, jsx } from "@emotion/react";
import React, { useEffect, useState } from "react";

import { User } from "../../shared/User";
import { Pinboard, PinboardData } from "./pinboard";
import { SelectPinboard } from "./selectPinboard";

const bottomRight = 10;
const widgetSize = 50;
const boxShadow =
  "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)";
export interface WidgetProps {
  user: User;
  preselectedComposerId: string | undefined;
}

export const Widget = (props: WidgetProps) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const [manuallyOpenedPinboards, setManuallyOpenedPinboards] = useState<
    PinboardData[]
  >([]);

  const preselectedPinboard: PinboardData | undefined = useQuery(gql`
      query MyQuery {
        getPinboardByComposerId(composerId: "${props.preselectedComposerId}")
        {    
          title
          status
          id
          composerId
        }
      }`).data?.getPinboardByComposerId;

  const pinboards: PinboardData[] = preselectedPinboard
    ? [preselectedPinboard, ...manuallyOpenedPinboards]
    : manuallyOpenedPinboards;

  const pinboardIds = pinboards.map((_) => _.id);

  const [selectedPinboardId, setSelectedPinboardId] = useState<string | null>();

  useEffect(() => setSelectedPinboardId(preselectedPinboard?.id), [
    preselectedPinboard,
  ]);

  const clearSelectedPinboard = () => setSelectedPinboardId(null);

  const openPinboard = (pinboardData: PinboardData) => {
    if (!pinboardIds.includes(pinboardData.id)) {
      setManuallyOpenedPinboards([...manuallyOpenedPinboards, pinboardData]);
    }

    setSelectedPinboardId(pinboardData.id);
  };

  const closePinboard = (pinboardData: PinboardData) => {
    if (pinboardIds.includes(pinboardData.id)) {
      setManuallyOpenedPinboards([
        ...manuallyOpenedPinboards.filter(
          (pinboard) => pinboard.id != pinboardData.id
        ),
      ]);
    }
    setSelectedPinboardId(null);
  };

  const [errors, setErrors] = useState<{
    [pinboardId: string]: ApolloError | undefined;
  }>({});

  const setError = (pinboardId: string, error: ApolloError | undefined) =>
    setErrors({ ...errors, [pinboardId]: error });

  const hasError = Object.entries(errors).find(
    ([pinboardId, error]) => pinboardIds.includes(pinboardId) && error
  );

  const [unreadFlags, setUnreadFlags] = useState<{
    [pinboardId: string]: boolean | undefined;
  }>({});

  const setUnreadFlag = (pinboardId: string, unreadFlag: boolean | undefined) =>
    setUnreadFlags({ ...unreadFlags, [pinboardId]: unreadFlag });

  const hasUnread = Object.entries(unreadFlags).find(
    ([pinboardId, unreadFlag]) => pinboardIds.includes(pinboardId) && unreadFlag
  );

  return (
    <div>
      <div
        css={css`
          position: fixed;
          z-index: 99999;
          bottom: ${bottomRight}px;
          right: ${bottomRight}px;
          width: ${widgetSize}px;
          height: ${widgetSize}px;
          border-radius: ${widgetSize / 2}px;
          cursor: pointer;
          background: orange;
          box-shadow: ${boxShadow};
        `}
        onClick={() => setIsExpanded((previous) => !previous)}
      >
        <div
          css={css`
            position: absolute;
            font-size: ${widgetSize / 2}px;
            top: ${widgetSize / 4}px;
            left: ${widgetSize / 4}px;
            user-select: none;
          `}
        >
          📌
        </div>
        {hasError && (
          <div
            css={css`
              position: absolute;
              font-size: ${widgetSize / 3}px;
              bottom: -${widgetSize / 16}px;
              right: -${widgetSize / 16}px;
              user-select: none;
              text-shadow: 0 0 5px black;
            `}
          >
            ⚠️
          </div>
        )}
        {hasUnread && (
          <div
            css={css`
              position: absolute;
              font-size: ${widgetSize / 3}px;
              top: -${widgetSize / 16}px;
              user-select: none;
            `}
          >
            🔴
          </div>
        )}
      </div>
      <div
        css={css`
          position: fixed;
          z-index: 99998;
          background: white;
          box-shadow: ${boxShadow};
          border: 2px orange solid;
          width: 250px;
          height: calc(100vh - 100px);
          bottom: ${bottomRight + widgetSize / 2 - 5}px;
          right: ${bottomRight + widgetSize / 2 - 5}px;
          display: ${isExpanded ? "flex" : "none"};
          flex-direction: column;
          justify-content: space-between;
          font-family: sans-serif;
        `}
      >
        {!selectedPinboardId && (
          <SelectPinboard
            openPinboard={openPinboard}
            pinboardIds={pinboardIds}
            closePinboard={closePinboard}
          />
        )}
        {pinboards.map((pinboardData) => (
          <Pinboard
            {...props}
            pinboardData={pinboardData}
            key={pinboardData.id}
            setError={setError}
            setUnreadFlag={setUnreadFlag}
            isExpanded={pinboardData.id === selectedPinboardId && isExpanded}
            isSelected={pinboardData.id === selectedPinboardId}
            clearSelectedPinboard={clearSelectedPinboard}
          />
        ))}
      </div>
    </div>
  );
};
