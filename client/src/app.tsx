import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import root from "react-shadow/emotion";
import { PayloadAndType } from "./types/PayloadAndType";
import {
  AddToPinboardButtonPortal,
  ASSET_HANDLE_HTML_TAG,
} from "./addToPinboardButton";
import {
  ApolloClient,
  ApolloProvider,
  ReactiveVar,
  useMutation,
  useQuery,
  useReactiveVar,
  useSubscription,
} from "@apollo/client";
import {
  gqlAddCompletedTourStep,
  gqlGetMyUser,
  gqlGetUsers,
  gqlOnManuallyOpenedPinboardIdsChanged,
  gqlSetWebPushSubscriptionForUser,
} from "../gql";
import { Item, MyUser, User } from "../../shared/graphql/graphql";
import { ItemWithParsedPayload } from "./types/ItemWithParsedPayload";
import { HiddenIFrameForServiceWorker } from "./pushNotificationPreferences";
import { GlobalStateProvider } from "./globalState";
import { Floaty } from "./floaty";
import { Panel } from "./panel";
import { convertGridDragEventToPayload, isGridDragEvent } from "./drop";
import { TickContext } from "./formattedDateTime";
import {
  IPinboardEventTags,
  PINBOARD_TELEMETRY_TYPE,
  TelemetryContext,
} from "./types/Telemetry";
import { IUserTelemetryEvent } from "@guardian/user-telemetry-client";
import {
  EXPAND_PINBOARD_QUERY_PARAM,
  OPEN_PINBOARD_QUERY_PARAM,
} from "../../shared/constants";
import { UserLookup } from "./types/UserLookup";
import {
  InlineMode,
  WORKFLOW_PINBOARD_ELEMENTS_QUERY_SELECTOR,
} from "./inline/inlineMode";
import { getAgateFontFaceIfApplicable } from "../fontNormaliser";
import { Global } from "@emotion/react";
import { TourStateProvider } from "./tour/tourState";
import { demoMentionableUsers, demoUser } from "./tour/tourConstants";

const PRESELECT_PINBOARD_HTML_TAG = "pinboard-preselect";
const PRESET_UNREAD_NOTIFICATIONS_COUNT_HTML_TAG = "pinboard-bubble-preset";

interface PinBoardAppProps {
  apolloClient: ApolloClient<Record<string, unknown>>;
  hasApolloAuthErrorVar: ReactiveVar<boolean>;
  userEmail: string;
}

export const PinBoardApp = ({
  apolloClient,
  hasApolloAuthErrorVar,
  userEmail,
}: PinBoardAppProps) => {
  const isInlineMode = useMemo(
    () => window.location.hostname.startsWith("workflow."),
    []
  );

  const [payloadToBeSent, setPayloadToBeSent] = useState<PayloadAndType | null>(
    null
  );
  const [assetHandles, setAssetHandles] = useState<HTMLElement[]>([]);
  const [workflowPinboardElements, setWorkflowPinboardElements] = useState<
    HTMLElement[]
  >([]);

  const queryParams = new URLSearchParams(window.location.search);
  // using state here but without setter, because host application/SPA might change url
  // and lose the query param, but we don't want to lose the preselection
  const [openPinboardIdBasedOnQueryParam] = useState(
    queryParams.get(OPEN_PINBOARD_QUERY_PARAM)
  );

  const [preSelectedComposerId, setPreselectedComposerId] = useState<
    string | null | undefined
  >(null);

  const [composerSection, setComposerSection] = useState<string | undefined>();

  const [isExpanded, setIsExpanded] = useState<boolean>(
    !!openPinboardIdBasedOnQueryParam || // expand by default when preselected via url query param
      queryParams.get(EXPAND_PINBOARD_QUERY_PARAM)?.toLowerCase() === "true"
  );
  const expandFloaty = () => setIsExpanded(true);

  const refreshAssetHandleNodes = () =>
    setAssetHandles(
      Array.from(document.querySelectorAll(ASSET_HANDLE_HTML_TAG))
    );

  const refreshWorkflowPinboardElements = () =>
    setWorkflowPinboardElements(
      Array.from(
        document.querySelectorAll(WORKFLOW_PINBOARD_ELEMENTS_QUERY_SELECTOR)
      )
    );

  const refreshPreselectedPinboard = () => {
    const preselectPinboardHTMLElement: HTMLElement | null =
      document.querySelector(PRESELECT_PINBOARD_HTML_TAG);
    const newComposerId = preselectPinboardHTMLElement?.dataset?.composerId;
    newComposerId !== preSelectedComposerId &&
      setPreselectedComposerId(newComposerId);

    const newComposerSection =
      preselectPinboardHTMLElement?.dataset?.composerSection;
    newComposerSection !== composerSection &&
      setComposerSection(newComposerSection);
  };

  const [presetUnreadNotificationCount, setPresetUnreadNotificationCount] =
    useState<number | undefined>();
  const refreshPresetUnreadNotifications = () => {
    const rawCount = (
      document.querySelector(
        PRESET_UNREAD_NOTIFICATIONS_COUNT_HTML_TAG
      ) as HTMLElement
    )?.dataset?.count;

    if (rawCount !== undefined) {
      const count = parseInt(rawCount);
      setPresetUnreadNotificationCount(isNaN(count) ? 0 : count);
    } else {
      setPresetUnreadNotificationCount(undefined);
    }
  };

  useEffect(() => {
    // Add nodes that already exist at time React app is instantiated
    refreshAssetHandleNodes();
    refreshWorkflowPinboardElements();

    refreshPreselectedPinboard();

    refreshPresetUnreadNotifications();

    // begin watching for any DOM changes
    new MutationObserver(() => {
      refreshAssetHandleNodes();
      refreshWorkflowPinboardElements();
      refreshPreselectedPinboard();
      refreshPresetUnreadNotifications();
    }).observe(document.body, {
      characterData: false,
      childList: true,
      subtree: true,
      characterDataOldValue: false,
      attributes: true,
      attributeOldValue: false,
      attributeFilter: [
        "data-composer-id",
        "data-composer-section",
        "data-working-title",
        "data-headline",
      ],
    });
  }, []);

  const [userLookup, setUserLookup] = useState<UserLookup>(
    // FIXME really not sure we should be doing this unless we're in the tour
    demoMentionableUsers.reduce(
      (acc, user) => ({ ...acc, [user.email]: user }),
      { [demoUser.email]: demoUser }
    )
  );

  const [userEmailsToLookup, setEmailsToLookup] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const newUsersToLookup = Array.from(userEmailsToLookup).filter(
      (email) => !userLookup[email]
    );
    if (newUsersToLookup.length > 0) {
      apolloClient
        .query({
          query: gqlGetUsers,
          variables: { emails: newUsersToLookup },
        })
        .then(({ data }) => {
          setUserLookup((existingUserLookup) =>
            data.getUsers.reduce(
              (acc: UserLookup, user: User) => ({
                ...acc,
                [user.email]: user,
              }),
              existingUserLookup
            )
          );
        });
    }
  }, [userEmailsToLookup]);

  const addEmailsToLookup = (emails: string[]) => {
    setEmailsToLookup(
      (existingEmails) => new Set([...existingEmails, ...emails])
    );
  };

  const meQuery = useQuery<{ getMyUser: MyUser }>(gqlGetMyUser, {
    client: apolloClient,
    onCompleted: ({ getMyUser }) => addEmailsToLookup([getMyUser.email]),
  });

  const me = meQuery.data?.getMyUser;

  const manuallyOpenedPinboardIds = me?.manuallyOpenedPinboardIds;
  const setManuallyOpenedPinboardIds = (newMyUser: MyUser) => {
    meQuery.updateQuery(() => ({ getMyUser: newMyUser }));
  };

  const addCompletedTourStep = (tourStepId: string) =>
    apolloClient
      .mutate<{
        addCompletedTourStep: MyUser;
      }>({
        mutation: gqlAddCompletedTourStep,
        variables: {
          tourStepId,
        },
      })
      .then(({ data }) => {
        data?.addCompletedTourStep &&
          meQuery.updateQuery(() => ({ getMyUser: data.addCompletedTourStep }));
      });

  useSubscription<{ onManuallyOpenedPinboardIdsChanged: MyUser }>(
    gqlOnManuallyOpenedPinboardIdsChanged(userEmail),
    {
      client: apolloClient,
      onSubscriptionData: ({ subscriptionData }) => {
        subscriptionData.data &&
          setManuallyOpenedPinboardIds(
            subscriptionData.data?.onManuallyOpenedPinboardIdsChanged
          );
      },
    }
  );

  const rawHasWebPushSubscription = me?.hasWebPushSubscription;

  const [hasWebPushSubscription, setHasWebPushSubscription] = useState<
    boolean | null | undefined
  >(rawHasWebPushSubscription);

  useEffect(() => {
    setHasWebPushSubscription(rawHasWebPushSubscription);
  }, [rawHasWebPushSubscription]);

  const [setWebPushSubscriptionForUser] = useMutation<{
    setWebPushSubscriptionForUser: MyUser;
  }>(gqlSetWebPushSubscriptionForUser, {
    client: apolloClient,
    onCompleted: ({
      setWebPushSubscriptionForUser: { hasWebPushSubscription },
    }) => setHasWebPushSubscription(hasWebPushSubscription),
    onError: (error) => {
      const message = "Could not subscribe to desktop notifications";
      alert(message);
      console.error(message, error);
    },
  });

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (
        event.source !== window &&
        Object.prototype.hasOwnProperty.call(event.data, "webPushSubscription")
      ) {
        setWebPushSubscriptionForUser({
          variables: {
            webPushSubscription: event.data.webPushSubscription,
          },
        });
      }
    });
  }, []);

  const serviceWorkerIFrameRef = useRef<HTMLIFrameElement>(null);

  const showDesktopNotification = (item?: Item) => {
    if (item && item.userEmail !== userEmail) {
      setTimeout(
        () =>
          serviceWorkerIFrameRef.current?.contentWindow?.postMessage(
            {
              item: {
                ...item,
                payload: item.payload && JSON.parse(item.payload),
              } as ItemWithParsedPayload,
            },
            "*"
          ),
        500
      );
    }
  };

  const clearDesktopNotificationsForPinboardId = (pinboardId: string) => {
    setTimeout(
      () =>
        serviceWorkerIFrameRef.current?.contentWindow?.postMessage(
          {
            clearNotificationsForPinboardId: pinboardId,
          },
          "*"
        ),
      1000
    );
  };

  const [lastTickTimestamp, setLastTickTimestamp] = useState<number>(
    Date.now()
  );
  useEffect(() => {
    const intervalHandle = setInterval(
      () => setLastTickTimestamp(Date.now()),
      60 * 1000
    );
    return () => clearInterval(intervalHandle);
  }, []);

  const [isDropTarget, setIsDropTarget] = useState<boolean>(false);

  const basicSendTelemetryEvent = useContext(TelemetryContext);

  const sendTelemetryEvent = (
    type: PINBOARD_TELEMETRY_TYPE,
    tags?: IUserTelemetryEvent["tags"] & IPinboardEventTags,
    value: boolean | number = true
  ) => {
    const newTags =
      preSelectedComposerId && composerSection
        ? {
            composerId: preSelectedComposerId,
            composerSection,
            ...(tags || {}),
          }
        : tags;
    basicSendTelemetryEvent?.(type, newTags, value);
  };

  useEffect(() => {
    sendTelemetryEvent?.(
      PINBOARD_TELEMETRY_TYPE.PINBOARD_LOADED,
      preSelectedComposerId && composerSection
        ? {
            composerId: preSelectedComposerId,
            composerSection: composerSection,
          }
        : {}
    );
  }, [preSelectedComposerId, composerSection]);

  const agateFontFaceIfApplicable = useMemo(getAgateFontFaceIfApplicable, []);

  const hasApolloAuthError = useReactiveVar(hasApolloAuthErrorVar);

  return (
    <TelemetryContext.Provider value={sendTelemetryEvent}>
      <ApolloProvider client={apolloClient}>
        <GlobalStateProvider
          hasApolloAuthError={hasApolloAuthError}
          presetUnreadNotificationCount={presetUnreadNotificationCount}
          userEmail={userEmail}
          openPinboardIdBasedOnQueryParam={openPinboardIdBasedOnQueryParam}
          preselectedComposerId={preSelectedComposerId}
          payloadToBeSent={payloadToBeSent}
          setPayloadToBeSent={setPayloadToBeSent}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          userLookup={userLookup}
          addEmailsToLookup={addEmailsToLookup}
          hasWebPushSubscription={hasWebPushSubscription}
          manuallyOpenedPinboardIds={manuallyOpenedPinboardIds || []}
          setManuallyOpenedPinboardIds={setManuallyOpenedPinboardIds}
          showNotification={showDesktopNotification}
          clearDesktopNotificationsForPinboardId={
            clearDesktopNotificationsForPinboardId
          }
          hasEverUsedTour={me?.hasEverUsedTour}
          addCompletedTourStep={addCompletedTourStep}
        >
          <TourStateProvider>
            <Global styles={agateFontFaceIfApplicable} />
            <HiddenIFrameForServiceWorker iFrameRef={serviceWorkerIFrameRef} />
            <root.div
              onDragOver={(event) =>
                isGridDragEvent(event) && event.preventDefault()
              }
              onDragEnter={(event) => {
                if (isGridDragEvent(event)) {
                  event.preventDefault();
                  setIsDropTarget(true);
                }
              }}
              onDragLeave={() => setIsDropTarget(false)}
              onDragEnd={() => setIsDropTarget(false)}
              onDragExit={() => setIsDropTarget(false)}
              onDrop={(event) => {
                if (isGridDragEvent(event)) {
                  event.preventDefault();
                  const payload = convertGridDragEventToPayload(event);
                  setPayloadToBeSent(payload);
                  setIsExpanded(true);
                  payload &&
                    sendTelemetryEvent?.(
                      PINBOARD_TELEMETRY_TYPE.DRAG_AND_DROP,
                      {
                        assetType: payload.type,
                      }
                    );
                }
                setIsDropTarget(false);
              }}
            >
              <TickContext.Provider value={lastTickTimestamp}>
                {isInlineMode ? (
                  <InlineMode
                    workflowPinboardElements={workflowPinboardElements}
                  />
                ) : (
                  <React.Fragment>
                    <Floaty isDropTarget={isDropTarget} />
                    <Panel isDropTarget={isDropTarget} />
                  </React.Fragment>
                )}
              </TickContext.Provider>
            </root.div>
            {assetHandles.map((node, index) => (
              <AddToPinboardButtonPortal
                key={index}
                node={node}
                setPayloadToBeSent={setPayloadToBeSent}
                expand={expandFloaty}
              />
            ))}
          </TourStateProvider>
        </GlobalStateProvider>
      </ApolloProvider>
    </TelemetryContext.Provider>
  );
};
