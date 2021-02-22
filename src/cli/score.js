// @flow

import {join as pathJoin} from "path";
import stringify from "json-stable-stringify";

import type {Command} from "./command";
import {loadInstanceConfig, prepareCredData} from "./common";
import {loadJsonWithDefault, mkdirx} from "../util/disk";
import dedent from "../util/dedent";
import {LoggingTaskReporter} from "../util/taskReporter";
import {
  compute,
  toJSON as credResultToJSON,
  stripOverTimeDataForNonUsers,
} from "../analysis/credResult";
import {CredView} from "../analysis/credView";
import * as Params from "../analysis/timeline/params";
import {computeCredAccounts} from "../core/ledger/credAccounts";
import {DiskStorage} from "../core/storage/disk";
import {toByteString} from "../core/storage";

function die(std, message) {
  std.err("fatal: " + message);
  return 1;
}

const scoreCommand: Command = async (args, std) => {
  if (args.length !== 0) {
    return die(std, "usage: sourcecred score");
  }
  const taskReporter = new LoggingTaskReporter();
  taskReporter.start("score");
  const baseDir = process.cwd();
  const diskStorage = new DiskStorage();
  const config = await loadInstanceConfig(baseDir);

  const {weightedGraph, ledger, dependencies} = await prepareCredData(
    baseDir,
    config
  );

  const plugins = Array.from(config.bundledPlugins.values());
  const declarations = plugins.map((x) => x.declaration());

  // TODO(@decentralion): This is snapshot tested, add unit tests?
  const paramsPath = pathJoin(baseDir, "config", "params.json");
  const params = await loadJsonWithDefault(
    paramsPath,
    Params.parser,
    Params.defaultParams
  );

  const credResult = await compute(
    weightedGraph,
    params,
    declarations,
    dependencies
  );
  // Throw away over-time data for all non-user nodes; we may not have that
  // information available once we merge CredRank, anyway.
  const stripped = stripOverTimeDataForNonUsers(credResult);
  const credJSON = toByteString(stringify(credResultToJSON(stripped)));
  const outputDir = pathJoin("output");
  mkdirx(outputDir);
  const outputPath = pathJoin(outputDir, "credResult.json");
  await diskStorage.set(outputPath, credJSON);

  // Write out the account data for convenient usage.
  // Note: this is an experimental format and may change or get
  // removed in the future.
  const credView = new CredView(credResult);
  const credAccounts = computeCredAccounts(ledger, credView);
  const accountsPath = pathJoin("output", "accounts.json");
  await diskStorage.set(accountsPath, toByteString(stringify(credAccounts)));

  taskReporter.finish("score");
  return 0;
};

export const scoreHelp: Command = async (args, std) => {
  std.out(
    dedent`\
      usage: sourcecred score

      Calculate cred scores from existing graph

      'sourcecred graph' must be run prior to this command.
      `.trimRight()
  );
  return 0;
};

export default scoreCommand;
