import * as React from "react";

import {
  Header,
  ScrollContainer,
  RowColumn,
  RowContainer
} from "../ListComponents";
import { Query, QueryResult } from "react-apollo";
import {
  ScheduleRootQuery,
  ScheduleRootQuery_scheduleOrError_RunningSchedule_attemptList
} from "./types/ScheduleRootQuery";
import Loading from "../Loading";
import gql from "graphql-tag";
import { RouteComponentProps } from "react-router";
import { Link } from "react-router-dom";
import { ScheduleRow, ScheduleRowFragment, AttemptStatus } from "./ScheduleRow";

import { HighlightedCodeBlock } from "../HighlightedCodeBlock";
import { showCustomAlert } from "../CustomAlertProvider";
import { unixTimestampToString } from "../Util";
import { RunStatus } from "../runs/RunUtils";
import styled from "styled-components/macro";
import {
  Collapse,
  Divider,
  Icon,
  Intent,
  Callout,
  Code
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import { useState } from "react";

const NUM_RUNS_TO_DISPLAY = 10;
const NUM_ATTEMPTS_TO_DISPLAY = 25;

export class ScheduleRoot extends React.Component<
  RouteComponentProps<{ scheduleName: string }>
> {
  render() {
    const { scheduleName } = this.props.match.params;

    return (
      <Query
        query={SCHEDULE_ROOT_QUERY}
        variables={{
          scheduleName,
          limit: NUM_RUNS_TO_DISPLAY,
          attemptsLimit: NUM_ATTEMPTS_TO_DISPLAY
        }}
        fetchPolicy="cache-and-network"
        pollInterval={15 * 1000}
        partialRefetch={true}
      >
        {(queryResult: QueryResult<ScheduleRootQuery, any>) => (
          <Loading queryResult={queryResult} allowStaleData={true}>
            {result => {
              const { scheduleOrError } = result;

              if (scheduleOrError.__typename === "RunningSchedule") {
                return (
                  <ScrollContainer>
                    <Header>Schedules</Header>
                    <ScheduleRow schedule={scheduleOrError} />
                    <AttemptsTable attemptList={scheduleOrError.attemptList} />
                  </ScrollContainer>
                );
              } else {
                return null;
              }
            }}
          </Loading>
        )}
      </Query>
    );
  }
}

interface AttemptsTableProps {
  attemptList: ScheduleRootQuery_scheduleOrError_RunningSchedule_attemptList[];
}

const AttemptsTable: React.FunctionComponent<AttemptsTableProps> = ({
  attemptList
}) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!attemptList || !attemptList.length) {
    return null;
  }
  return (
    <AttemptsTableContainer>
      <Header>
        Old Attempts (Deprecated){" "}
        <Icon
          style={{ cursor: "pointer" }}
          icon={isOpen ? IconNames.CHEVRON_DOWN : IconNames.CHEVRON_RIGHT}
          iconSize={Icon.SIZE_LARGE}
          intent={Intent.PRIMARY}
          onClick={() => setIsOpen(!isOpen)}
        />
      </Header>
      <Divider />
      <Collapse isOpen={isOpen}>
        <Callout
          title={
            "These schedule attempts will be no longer visible in Dagit 0.8.0"
          }
          intent={Intent.WARNING}
          style={{ margin: "10px 0" }}
        >
          <p>
            The way Dagster stores schedule attempts has been updated to use a
            database, which can be configured using{" "}
            <a href="https://docs.dagster.io/latest/deploying/instance/#scheduler-storage">
              <Code>Scheduler Storage</Code>
            </a>
            . Previously, attempts were stored on the fileystem at{" "}
            <Code>$DAGSTER_HOME/schedules/logs/</Code>. This update removes the
            dependency on the filesytem for the scheduler, and enables the
            durability of schedule attempt history across deploys of dagster.
          </p>
        </Callout>
        {attemptList.map((attempt, i) => (
          <RowContainer key={i} style={{ marginBottom: 0, boxShadow: "none" }}>
            <RowColumn
              style={{
                maxWidth: 30,
                borderRight: 0,
                padding: 7
              }}
            >
              {attempt.run ? (
                <RunStatus status={attempt.run.status} />
              ) : (
                <AttemptStatus status={attempt.status} />
              )}
            </RowColumn>
            <RowColumn style={{ textAlign: "left", borderRight: 0 }}>
              {attempt.run ? (
                <div>
                  <Link to={`/runs/all/${attempt.run.runId}`}>
                    {attempt.run.runId}
                  </Link>
                </div>
              ) : (
                <div>
                  <ButtonLink
                    onClick={() =>
                      showCustomAlert({
                        title: "Schedule Response",
                        body: (
                          <>
                            <HighlightedCodeBlock
                              value={JSON.stringify(
                                JSON.parse(attempt.jsonResult),
                                null,
                                2
                              )}
                              languages={["json"]}
                            />
                          </>
                        )
                      })
                    }
                  >
                    {" "}
                    View error
                  </ButtonLink>
                </div>
              )}
            </RowColumn>
            <RowColumn
              style={{ maxWidth: 200, paddingLeft: 0, textAlign: "left" }}
            >
              {unixTimestampToString(attempt.time)}
            </RowColumn>
          </RowContainer>
        ))}
      </Collapse>
    </AttemptsTableContainer>
  );
};

export const SCHEDULE_ROOT_QUERY = gql`
  query ScheduleRootQuery(
    $scheduleName: String!
    $limit: Int!
    $attemptsLimit: Int!
  ) {
    scheduleOrError(scheduleName: $scheduleName) {
      ... on RunningSchedule {
        ...ScheduleFragment
        scheduleDefinition {
          name
        }
        attemptList: attempts(limit: $attemptsLimit) {
          time
          jsonResult
          status
          run {
            runId
            status
          }
        }
      }
      ... on ScheduleNotFoundError {
        message
      }
      ... on PythonError {
        message
        stack
      }
    }
  }

  ${ScheduleRowFragment}
`;

const AttemptsTableContainer = styled.div`
  margin: 20px 0;
`;
const ButtonLink = styled.button`
  color: #106ba3;
  margin-left: 10px;
  font-size: 14px;
  background: none !important;
  border: none;
  padding: 0 !important;
  font-family: inherit;
  cursor: pointer;
  &: hover {
    text-decoration: underline;
  }
}
`;
