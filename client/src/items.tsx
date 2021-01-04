/** @jsx jsx */
import { Item } from "../../shared/graphql/graphql";
import React, { ReactElement, useEffect, useRef } from "react";
import { User } from "../../shared/User";
import { css, jsx } from "@emotion/react";

interface ItemDisplayProps {
  item: Item;
  refForLastItem: React.RefObject<HTMLDivElement> | undefined;
}

const ItemDisplay = ({ item, refForLastItem }: ItemDisplayProps) => {
  const user = JSON.parse(item.user) as User;

  return (
    <div
      ref={refForLastItem}
      css={css`
        border-bottom: 1px solid gray;
        padding-bottom: 3px;
        margin-bottom: 3px;
      `}
    >
      <div
        css={css`
          display: "flex";
          justify-content: space-between;
          font-size: 80%;
          color: lightgray;
        `}
      >
        <span>{user.firstName}</span>
        <span>
          {new Date(item.timestamp * 1000).toTimeString().substr(0, 8)}
        </span>
      </div>
      <div>{item.message}</div>
    </div>
  );
};

interface ItemsProps {
  initialItems: Item[];
  subscriptionItems: Item[];
  setHasUnread: (hasUnread: boolean) => void;
  isExpanded: boolean;
}

const isScrollbarVisible = (scrollableArea: HTMLDivElement) =>
  scrollableArea.scrollHeight <= scrollableArea.clientHeight;

const elementIsVisible = (
  scrollableArea: HTMLDivElement,
  element: HTMLElement
) => {
  const elementTopRelativeToScrollableArea =
    element.offsetTop - scrollableArea.offsetTop;
  const scrollTop = scrollableArea.scrollTop;
  const scrollableAreaHeight = scrollableArea.clientHeight;
  const scrollTopThreshold =
    elementTopRelativeToScrollableArea - scrollableAreaHeight - 10;
  return scrollTop > scrollTopThreshold;
};

export const Items = ({
  initialItems,
  subscriptionItems,
  setHasUnread,
  isExpanded,
}: ItemsProps): ReactElement => {
  const items = [...initialItems, ...subscriptionItems].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  const scrollableAreaRef = useRef<HTMLDivElement>(null);
  const scrollableArea = scrollableAreaRef.current;

  const lastItemRef = useRef<HTMLDivElement>(null);
  const lastItemIndex = items.length - 1;

  const scrollToLastItem = () => {
    setTimeout(
      // TODO: could we use request animation frame?
      () =>
        lastItemRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        }),
      1
    );
  };

  useEffect(scrollToLastItem, []); // runs once at the beginning

  const isLastItemVisible = () =>
    scrollableArea &&
    lastItemRef.current &&
    (isScrollbarVisible(scrollableArea) ||
      elementIsVisible(scrollableArea, lastItemRef.current));

  useEffect(() => {
    if (isLastItemVisible()) {
      scrollToLastItem();
    } else if (isExpanded) {
      setHasUnread(true);
    }
  }, [subscriptionItems]); // runs after render when the list of subscription items has changed (e.g. new message received)

  useEffect(() => {
    if (isExpanded && isLastItemVisible()) {
      setHasUnread(false);
    }
  }, [isExpanded]); // runs when the widget is expanded/closed

  return (
    <div
      ref={scrollableAreaRef}
      css={css`
        overflow-y: auto;
        margin: 5px;
      `}
      onScroll={() => isLastItemVisible() && setHasUnread(false)}
    >
      {items.map((item, index) => (
        <ItemDisplay
          key={item.id}
          item={item}
          refForLastItem={index === lastItemIndex ? lastItemRef : undefined}
        />
      ))}
    </div>
  );
};
