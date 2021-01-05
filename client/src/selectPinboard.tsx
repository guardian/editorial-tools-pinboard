/** @jsx jsx */

import { gql, useQuery } from "@apollo/client";
import React from "react";
import FuzzySearch from "react-fuzzy";
import { css, jsx } from "@emotion/react";

import { PinboardData } from "./pinboard";

interface SelectPinboardProps {
  openPinboard: (pinboardData: PinboardData) => void;
  closePinboard: (pinboardId: string) => void;
  pinboardIds: string[];
}

export const SelectPinboard = ({
  openPinboard,
  closePinboard,
  pinboardIds,
}: SelectPinboardProps) => {
  const { data, loading } = useQuery(gql`
    query MyQuery {
      listPinboards {
        composerId
        id
        status
        title
      }
    }
  `);

  // TODO: improve styling, add unread/error badges beside open pinboards

  const OpenPinboardButton = (pinboardData: PinboardData) => (
    <div
      css={css`
        display: flex;
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
        {pinboardData.title}
      </button>
      {pinboardIds.includes(pinboardData.id) && (
        <button onClick={() => closePinboard(pinboardData.id)}>❌</button>
      )}
    </div>
  );

  return (
    <div
      css={css`
        overflow-y: auto;
        margin: 5px;
        h4 {
          color: black;
        }
      `}
    >
      {loading && <p>Loading pinboards...</p>}
      <h4>Open pinboards</h4>
      {data &&
        data.listPinboards
          .filter((pinboardData: PinboardData) =>
            pinboardIds.includes(pinboardData.id)
          )
          .map(OpenPinboardButton)}
      <h4>Find pinboard</h4>
      {data && (
        <FuzzySearch
          list={data.listPinboards}
          keys={["title"]}
          onSelect={openPinboard}
          width={225}
          threshold={0.3}
        ></FuzzySearch>
      )}
      <h4>Open a pinboard</h4>
      {data &&
        data.listPinboards
          .filter(
            (pinboardData: PinboardData) =>
              !pinboardIds.includes(pinboardData.id)
          )
          .map(OpenPinboardButton)}
    </div>
  );
};
