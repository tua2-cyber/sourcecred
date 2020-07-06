// @flow

/**
 * This module has a core data type identifying SourceCred users.
 *
 * The scope for this data type is to model:
 * - a unique identifier for each user
 * - a unique (renameable) username they choose
 * - the address of every node they correspond to in the graph
 *
 * Unlike most other state in SourceCred, the User state is
 * nondeterministically generated by SourceCred itself, and then persisted
 * long-term within the instance.
 *
 * This is in contrast to Graph data, which usually comes from an external
 * source, and is not persisted long-term, but instead is re-generated when
 * needed.
 *
 * In particular, this kernel of user data is stored within the core ledger,
 * since it's necessary to track consistently when tracking Grain distribution.
 * This type should not grow to include all the data that the UI will
 * eventually want to show; that should be kept in a different data store which
 * isn't being used as a transaction ledger.
 *
 */
import {
  type Uuid,
  parser as uuidParser,
  random as randomUuid,
} from "../util/uuid";
import * as C from "../util/combo";
import {
  type NodeAddressT,
  NodeAddress,
  type Node as GraphNode,
} from "../core/graph";

/**
 * We validate usernames using GitHub-esque rules.
 */
export opaque type Username: string = string;
const USERNAME_PATTERN = /^@?([A-Za-z0-9-_]+)$/;

export type UserId = Uuid;
export type User = {|
  // UUID, assigned when the user is created.
  +id: UserId,
  +name: Username,
  // Every other node in the graph that this user corresponds to.
  // Does not include the user's "own" address, i.e. the result
  // of calling (userAddress(user.id)).
  +aliases: $ReadOnlyArray<NodeAddressT>,
|};

// It's not in the typical [owner, name] format because it isn't provided by a plugin.
// Instead, it's a raw type owned by SourceCred project.
export const USER_PREFIX = NodeAddress.fromParts(["sourcecred", "USER"]);

/**
 * Create a new user, assigning a random id.
 */
export function createUser(name: string): User {
  return {
    id: randomUuid(),
    name,
    aliases: [],
  };
}

/**
 * Parse a Username from a string.
 *
 * Throws an error if the username is invalid.
 */
export function usernameFromString(username: string): Username {
  const re = new RegExp(USERNAME_PATTERN);
  const match = re.exec(username);
  if (match == null) {
    throw new Error(`invalid username: ${username}`);
  }
  return match[1];
}

export function userAddress(id: UserId): NodeAddressT {
  return NodeAddress.append(USER_PREFIX, id);
}

export function graphNode({id, name}: User): GraphNode {
  return {
    address: userAddress(id),
    description: name,
    timestampMs: null,
  };
}

export const usernameParser: C.Parser<Username> = C.fmap(
  C.string,
  usernameFromString
);

export const userParser: C.Parser<User> = C.object({
  id: uuidParser,
  name: usernameParser,
  aliases: C.array(C.fmap(C.string, NodeAddress.fromRaw)),
});

type Aliases = $PropertyType<User, "aliases">;
export function aliasesDiffer(a: Aliases, b: Aliases): boolean {
  const setA = new Set(a);
  const setB = new Set(b);

  // Should any value be missing from Set B, they're different.
  for (const value of setA) {
    if (!setB.has(value)) return false;
    setB.delete(value);
  }

  // After removing all of Set A, they're different if Set B is not empty.
  return setB.size === 0;
}
