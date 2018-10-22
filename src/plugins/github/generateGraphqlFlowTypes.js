// @flow

import prettier from "prettier";

import generateFlowTypes from "../../graphql/generateFlowTypes";
import schema from "./schema";

export default function generateGraphqlFlowTypes() {
  const prettierOptions = {
    ...{parser: "babylon"},
    ...(prettier.resolveConfig.sync(__filename) || {}),
  };
  return generateFlowTypes(schema(), prettierOptions);
}