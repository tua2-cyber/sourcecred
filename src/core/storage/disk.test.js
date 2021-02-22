// @flow
import {DiskStorage} from "./disk";
import tmp from "tmp";
import fs from "fs-extra";
import {join as pathJoin} from "path";
import {tmpdir} from "os";
// $FlowIgnore[missing-export]
import {TextEncoder, TextDecoder} from "util";

describe("core/storage/disk", () => {
  function tmpWithContents(contents: mixed) {
    const name = tmp.tmpNameSync();
    fs.writeFileSync(name, JSON.stringify(contents));
    return name;
  }
  const badPath = () => pathJoin(tmp.dirSync().name, "not-a-real-path");
  const fooDefault = () => ({foo: 1337});
  const getInstance = (baseDir?: string) => new DiskStorage(baseDir || "");
  const basedir = tmp.dirSync();
  const encoder = new TextEncoder();
  // $FlowIgnore[incompatible-call]
  const decoder = new TextDecoder();

  it("DiskStorage accepts a basepath", () => {
    const instance = new DiskStorage(tmpdir());
    expect(instance._basePath).toBe(tmpdir());
  });

  describe("get", () => {
    it("returns an existing file", async () => {
      const instance = getInstance("");
      const fname = tmpWithContents(fooDefault());

      const result = await instance.get(fname);
      expect(JSON.parse(decoder.decode(result))).toEqual(fooDefault());
    });
    it("throws if file doesn't exist", async () => {
      const instance = getInstance();
      const result = async () => await instance.get(badPath());
      await expect(result).rejects.toThrow("ENOENT");
    });
  });
  describe("set", () => {
    const fileName = "test.txt";
    const contents = encoder.encode("hello");
    it("can write a file to disk", async () => {
      const instance = getInstance(basedir.name);

      await instance.set(fileName, contents);
      const result = await instance.get(fileName);
      expect(decoder.decode(result)).toBe(decoder.decode(contents));
    });
    it("overwrites existing content", async () => {
      const instance = getInstance(basedir.name);
      const newContents = encoder.encode("goodBye");
      await instance.set(fileName, contents);
      await instance.set(fileName, newContents);
      const result = await instance.get(fileName);
      expect(decoder.decode(result)).toBe(decoder.decode(newContents));
    });
  });
  describe("_checkPathPrefix", () => {
    it("throws if a normalized path is outside the base path", () => {
      const instance = getInstance(basedir.name);
      const thunk = () => instance._checkPathPrefix("..");
      expect(thunk).toThrow("Path construction error");
    });
  });
});
