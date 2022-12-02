import ReactDOM from "react-dom";
import React from "react";
import { css } from "@emotion/react";
import root from "react-shadow/emotion";
import { composer, pinboard, pinMetal } from "../colours";
import { PinboardIdWithItemCounts } from "../../shared/graphql/graphql";
import { palette, space } from "@guardian/source-foundations";
import { agateSans } from "../fontNormaliser";
import { useGlobalStateContext } from "./globalState";
import { INLINE_PANEL_WIDTH, InlineModePanel } from "./inlineModePanel";

export const INLINE_TOGGLE_WIDTH = 50;

interface InlinePinboardToggleProps {
  pinboardId: string;
  workingTitle: string | null;
  headline: string | null;
  counts: PinboardIdWithItemCounts | undefined;
  isLoading: boolean;
  isSelected: boolean;
  setMaybeSelectedPinboardId: (newId: string | null) => void;
}

const InlinePinboardToggle = ({
  pinboardId,
  workingTitle,
  headline,
  counts,
  isLoading,
  isSelected,
  setMaybeSelectedPinboardId,
}: InlinePinboardToggleProps) => {
  const { unreadFlags } = useGlobalStateContext();
  return (
    <root.div>
      {isSelected && (
        <InlineModePanel
          pinboardId={pinboardId}
          workingTitle={workingTitle}
          headline={headline}
          closePanel={() => setMaybeSelectedPinboardId(null)}
        />
      )}
      <div
        onClick={(event) => {
          event.stopPropagation();
          setMaybeSelectedPinboardId(isSelected ? null : pinboardId);
        }}
        css={css`
          ${agateSans.xxsmall()};
          font-size: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          white-space: nowrap;
          background-color: ${pinboard["500"]};
          color: ${pinMetal};
          border-radius: ${space[1]}px;
          min-width: ${INLINE_TOGGLE_WIDTH}px;
          min-height: 18px;
          padding: 2px ${isSelected ? 25 : 3}px 2px 3px;
          margin-right: ${isSelected ? INLINE_PANEL_WIDTH + 15 : 0}px;
          position: relative;
          ${isSelected ? "z-index: 3;" : ""}
          &:hover {
            background-color: ${pinboard[isSelected ? "500" : "800"]};
          }
        `}
      >
        {isLoading ? (
          <em>loading...</em>
        ) : (
          <span>
            {counts?.unreadCount && unreadFlags?.[pinboardId] !== false ? (
              <span>
                <div
                  css={css`
                    display: inline-block;
                    border-radius: 10px;
                    background-color: ${composer.warning[300]};
                    padding: 0 2px;
                    margin: 1px;
                    min-width: 14px;
                    color: ${palette.neutral[100]};
                    text-align: center;
                    font-weight: bold;
                  `}
                >
                  {counts.unreadCount}
                </div>{" "}
                of
              </span>
            ) : (
              "total"
            )}{" "}
            <span
              css={css`
                font-weight: bold;
              `}
            >
              {counts?.totalCount || 0}
            </span>
          </span>
        )}
      </div>
    </root.div>
  );
};

interface InlinePinboardTogglePortalProps extends InlinePinboardToggleProps {
  node: HTMLElement;
}

export const InlinePinboardTogglePortal = ({
  node,
  ...props
}: InlinePinboardTogglePortalProps) =>
  ReactDOM.createPortal(<InlinePinboardToggle {...props} />, node);
