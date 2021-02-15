import ReactDOM from "react-dom";
import React, { ReactPortal } from "react";
import PinIcon from "../icons/pin-icon.svg";
import {css} from "@emotion/react";

export const PIN_BUTTON_HTML_TAG = "pinboard-add-button";

interface AddToPinboardButtonProps {
  dataAttributes: DOMStringMap;
}

const AddToPinboardButton = (props: AddToPinboardButtonProps) => (
  <button
    className="btn btn--deep"
    onClick={() => alert(JSON.stringify(props.dataAttributes, null, "  "))}
  >
    <PinIcon
      css={css`
        width: 50px;
      `}
    />{" "}
    Add to pinboard
  </button>
);

interface ButtonPortalProps {
  node: HTMLElement;
}

export const ButtonPortal = ({ node }: ButtonPortalProps): ReactPortal =>
  ReactDOM.createPortal(
    <AddToPinboardButton dataAttributes={node.dataset} />,
    node
  );
