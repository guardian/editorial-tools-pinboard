import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { css } from "@emotion/react";
import { space } from "@guardian/source-foundations";
import { agateSans } from "../fontNormaliser";
import Joyride, { CallBackProps, Placement, Step } from "react-joyride";
import PlayButton from "../icons/play-button.svg";
import CloseIcon from "../icons/close.svg";
import BeaconIcon from "../icons/beacon";
import EditIcon from "../icons/pencil.svg";
import BinIcon from "../icons/bin.svg";
import { RefHandler } from "./selectPinboard";

export interface InteractiveDemoProps {
  handleCallback?: (data: CallBackProps) => void;
  run: boolean;
  steps: Step[];
  stepIndex: number;
  mainKey: number;
  showProgress?: boolean;
}

export const InteractiveDemo = ({
  handleCallback,
  run,
  steps,
  stepIndex,
  mainKey,
  showProgress = true,
}: InteractiveDemoProps) => {
  return (
    <Joyride
      callback={handleCallback}
      run={run}
      steps={steps}
      stepIndex={stepIndex}
      key={mainKey}
      continuous
      scrollToFirstStep
      showSkipButton={false}
      spotlightPadding={1}
      spotlightClicks
      showProgress={showProgress}
      styles={{
        options: {
          primaryColor: "rgb(255, 140, 0)",
          zIndex: 999999,
        },
        tooltip: {
          fontFamily: "Guardian Agate Sans",
          textAlign: "left",
          fontSize: 14,
        },
        tooltipContent: {
          textAlign: "left",
        },
        tooltipFooter: {
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          padding: 0,
          margin: 0,
        },
        buttonNext: {
          fontSize: "14px",
          fontFamily: "Guardian Agate Sans",
        },
        buttonBack: {
          fontSize: "14px",
          fontFamily: "Guardian Agate Sans",
        },
        buttonClose: {
          fontSize: "14px",
          fontFamily: "Guardian Agate Sans",
        },
        buttonSkip: {
          fontSize: "14px",
          fontFamily: "Guardian Agate Sans",
        },
      }}
    />
  );
};

export const InteractiveDemoStartButton = ({
  start,
}: {
  start: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  return (
    <button
      css={css`
        display: flex;
        flex-direction: column;
        background-color: rgb(255, 140, 0);
        padding: ${space[1]}px;
        border-radius: 4px;
        ${agateSans.xxsmall({ lineHeight: "regular" })};
        gap: ${space[1]}px;
        margin: ${space[1]}px;
        margin-bottom: 0;
        cursor: pointer;
        border: 0;
      `}
      onClick={start}
    >
      <div
        css={css`
          display: flex;
        `}
      >
        <PlayButton
          css={css`
            padding-top: 2px;
            margin-left: 3px;
          `}
        />
        <div
          css={css`
            color: white;
            padding-left: ${space[1]}px;
            text-align: left;
          `}
        >
          First time on Pinboard? Start guided tour.
        </div>
        <CloseIcon
          css={css`
            margin-left: 10px;
            height: 10px;
            padding-top: 3px;
          `}
        />
      </div>
    </button>
  );
};
//
// export const interactiveDemoState = {
//     run: false,
//     stepIndex: 0,
//     steps: [],
//     active: false
// }
//
// export const InteractiveDemoContext = createContext({
//     state: interactiveDemoState,
//     setState: () => undefined,
// })
//
// InteractiveDemoContext.displayName = 'InteractiveDemoContext';

export const panelSteps = (ref: React.RefObject<HTMLDivElement>) => {
  return [
    {
      target: ref.current!,
      placement: "left" as Placement,
      title: "Welcome to Pinboard 👋",
      content: (
        <div
          style={{
            textAlign: "left",
            marginTop: `${space[1]}px`,
            padding: 0,
          }}
        >
          The Guardian's very own discussion and asset-sharing tool developed
          for the editorial.
          <div style={{ display: "flex", alignItems: "center" }}>
            Let's take a tour. Follow the orange beacon.
            <BeaconIcon />
          </div>
        </div>
      ),
      locale: { last: "Continue" },
      disableBeacon: true,
    },
  ];
};

export const selectPinboardsSteps = (
  panelRef: React.RefObject<HTMLDivElement>,
  ref: React.RefObject<RefHandler>
) => {
  return [
    {
      target: panelRef.current!,
      placement: "left" as Placement,
      title: "Welcome to Pinboard 👋",
      content: (
        <div
          style={{
            textAlign: "left",
            marginTop: `${space[1]}px`,
            padding: 0,
          }}
        >
          The Guardian's very own discussion and asset-sharing tool developed
          for the editorial.
          <div style={{ display: "flex", alignItems: "center" }}>
            Let's take a tour. Follow the orange beacon.
            <BeaconIcon />
          </div>
        </div>
      ),
      locale: { last: "Continue" },
      disableBeacon: true,
    },
    {
      target: ref.current!.myPinboardsRef.current!,
      title: "My Pinboards",
      content: (
        <div>
          Here you can find the list of Pinboards where you sent a message or
          are tagged by others.
        </div>
      ),
      placement: "left" as Placement,
    },
    {
      target: ref.current!.teamsPinboardsRef.current!,
      title: "My Teams' Pinboards",
      content: (
        <div>
          These are the Pinboards where your team is tagged (in a message or a
          request).
        </div>
      ),
      placement: "left" as Placement,
    },
    {
      target: ref.current!.searchbarRef.current!,
      title: "Search",
      content: (
        <div>
          You can search for other Pinboards on Workflow using this searchbar.
        </div>
      ),
      placement: "left" as Placement,
    },
    {
      target: ref.current!.notificationSubscriptionRef.current!,
      title: "Subscribe/Unsubscribe to Notifications",
      content: <div>You can set your browser notification settings here.</div>,
      placement: "left" as Placement,
    },
  ];
};

export const pinboardChatSteps = (
  messageAreaRef: React.RefObject<HTMLDivElement>
) => {
  return [
    {
      target: messageAreaRef.current!,
      title: "Sending messages",
      content: <div>Try typing messages here...</div>,
      placement: "left" as Placement,
    },
    {
      target: messageAreaRef.current!,
      title: "Tag someone",
      content: (
        <div>
          You can tag someone by typing their name with @. They will receive a
          message notification alert on their browser.
        </div>
      ),
      placement: "left" as Placement,
    },
    {
      target: messageAreaRef.current!,
      title: "Tag a team",
      content: (
        <div>
          <p>
            When you tag a team, everyone in the team will receive a
            notification (if their notification is turned on).
          </p>
          <p>
            You can turn a message into a 'request', so that the tagged team
            members can track the status.
          </p>
        </div>
      ),
      placement: "left" as Placement,
    },
    {
      target: messageAreaRef.current!,
      title: "Edit or delete your messages",
      content: (
        <div>
          You can also edit <EditIcon /> or delete <BinIcon /> a message by
          clicking on the corresponding icon next to your message.
        </div>
      ),
      placement: "left" as Placement,
    },
    {
      target: messageAreaRef.current!,
      title: "Share Grid images, collections or searches",
      content: (
        <div>
          You can share Grid images on Pinboard. Navigate to{" "}
          <a href={"https://media.test.dev-gutools.co.uk/"}>Grid</a>.
        </div>
      ),
      placement: "left" as Placement,
    },
  ];
};
