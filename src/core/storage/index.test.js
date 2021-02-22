// @flow

import {toByteString, fromByteString} from "./";

describe("core/storage/index", () => {
  const testString = "this is a tést 🥰";
  describe("toByteString", () => {
    it("produces strings of length equal to byte quantity", () => {
      const result = toByteString(testString);
      expect(result.length).toBe(20);
    });
  });
  it("bytestring helpers preserve correct encodings when used sequentially", () => {
    expect(fromByteString(toByteString(testString))).toBe(testString);
  });
});
