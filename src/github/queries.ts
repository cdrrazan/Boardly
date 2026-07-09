/** GraphQL documents for reading and mutating Projects (v2). */

const ITEM_FIELDS = /* GraphQL */ `
  id
  updatedAt
  fieldValues(first: 30) {
    nodes {
      __typename
      ... on ProjectV2ItemFieldSingleSelectValue {
        name
        optionId
        updatedAt
        field { ... on ProjectV2FieldCommon { name } }
      }
      ... on ProjectV2ItemFieldIterationValue {
        title
        iterationId
        updatedAt
        field { ... on ProjectV2FieldCommon { name } }
      }
      ... on ProjectV2ItemFieldNumberValue {
        number
        updatedAt
        field { ... on ProjectV2FieldCommon { name } }
      }
      ... on ProjectV2ItemFieldTextValue {
        text
        updatedAt
        field { ... on ProjectV2FieldCommon { name } }
      }
      ... on ProjectV2ItemFieldDateValue {
        date
        updatedAt
        field { ... on ProjectV2FieldCommon { name } }
      }
    }
  }
  content {
    __typename
    ... on Issue {
      id
      number
      title
      url
      state
      closedAt
      updatedAt
      repository { owner { login } name }
      assignees(first: 20) { nodes { login } }
      subIssuesSummary { total completed percentCompleted }
      parent { number title url }
    }
    ... on PullRequest {
      id
      number
      title
      url
      state
      merged
      closedAt
      updatedAt
      repository { owner { login } name }
      assignees(first: 20) { nodes { login } }
    }
  }
`;

const PROJECT_BODY = /* GraphQL */ `
  id
  title
  fields(first: 50) {
    nodes {
      __typename
      ... on ProjectV2FieldCommon { id name dataType }
      ... on ProjectV2SingleSelectField { id name dataType options { id name } }
      ... on ProjectV2IterationField {
        id
        name
        dataType
        configuration {
          iterations { id title startDate duration }
          completedIterations { id title startDate duration }
        }
      }
    }
  }
  items(first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes { ${ITEM_FIELDS} }
  }
`;

export const projectQuery = (ownerType: "org" | "user"): string => {
  const root = ownerType === "org" ? "organization" : "user";
  return /* GraphQL */ `
    query($owner: String!, $number: Int!, $cursor: String) {
      ${root}(login: $owner) {
        projectV2(number: $number) {
          ${PROJECT_BODY}
        }
      }
    }
  `;
};

export const setSingleSelectMutation = /* GraphQL */ `
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
      value: { singleSelectOptionId: $optionId }
    }) { projectV2Item { id } }
  }
`;

export const setIterationMutation = /* GraphQL */ `
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $iterationId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
      value: { iterationId: $iterationId }
    }) { projectV2Item { id } }
  }
`;

export const setNumberMutation = /* GraphQL */ `
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $number: Float!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
      value: { number: $number }
    }) { projectV2Item { id } }
  }
`;

export const setPositionMutation = /* GraphQL */ `
  mutation($projectId: ID!, $itemId: ID!, $afterId: ID) {
    updateProjectV2ItemPosition(input: {
      projectId: $projectId, itemId: $itemId, afterId: $afterId
    }) { clientMutationId }
  }
`;
