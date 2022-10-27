import { css } from "@emotion/react";
import React from "react";
import { StaticGridPayload } from "../types/PayloadAndType";
import CropIcon from "../../icons/crop.svg";
import PictureIcon from "../../icons/picture.svg";
import { palette } from "@guardian/source-foundations";

type GridStaticImageDisplayProps = StaticGridPayload & {
  scrollToBottomIfApplicable: undefined | (() => void);
};

export const GridStaticImageDisplay = ({
  type,
  payload,
  scrollToBottomIfApplicable,
}: GridStaticImageDisplayProps) => (
  <React.Fragment>
    <img
      src={payload.thumbnail}
      css={css`
        object-fit: contain;
        width: 100%;
        height: 100%;
      `}
      draggable={false}
      onLoad={scrollToBottomIfApplicable}
      // TODO: hover for larger thumbnail
    />

    {type === "grid-crop" && (
      <CropIcon
        css={css`
          fill: ${palette.neutral[46]};
          margin-top: 4px;
        `}
      />
    )}
    {type === "grid-original" && (
      <PictureIcon
        css={css`
          fill: ${palette.neutral[46]};
          margin-top: 4px;
        `}
      />
    )}
  </React.Fragment>
);
