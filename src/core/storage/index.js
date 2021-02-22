// @flow
// $FlowIgnore[missing-export]
import {TextEncoder, TextDecoder} from "util";

/**
 * A byte string represented as a Uint8Array. Each item in a byteString array
 * is a Uint8 representing a byte value.
 */
export type ByteString = Uint8Array;

/**
 * Data Storage is meant as a low-level interface to data that is not
 * already in process memory. If the value for the key entered cannot be found,
 * an error should throw.
 */
export interface DataStorage {
  get(key: string): Promise<ByteString>;
}

/**
 * WriteableDataStorage provides a low-level interface for preserving data
 * beyond a process' lifespan. On successful execution it should return an empty
 * Promise. On failure it should throw an error.
 */
export interface WritableDataStorage extends DataStorage {
  set(key: string, value: ByteString): Promise<void>;
}

/**
 * toByteString exists as a helper function for use with Data Storage
 * implementations.
 */
export function toByteString(s: string): ByteString {
  const encoder = new TextEncoder();
  return encoder.encode(s);
}

/**
 * fromByteString exists as a helper for converting byte strings read out of a
 * DataStorage implementation into regular javascript strings.
 */
export function fromByteString(b: ByteString): string {
  // $FlowIgnore[incompatible-call]
  const decoder = new TextDecoder();
  return decoder.decode(b);
}
