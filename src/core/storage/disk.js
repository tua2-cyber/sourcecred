// @flow

import type {ByteString, WritableDataStorage} from "./index";
import {join as pathJoin, normalize} from "path";
import fs from "fs-extra";

/**
 * Disk Storage abstracts away low-level file I/O operations, implementing the
 * Writable Data Storage interface. In this implementation, `path` aliases to
 * a key, and the `contents` parameter maps to the value.
 */
export class DiskStorage implements WritableDataStorage {
  +_basePath: string;

  constructor(basePath?: string) {
    this._basePath = basePath != null ? basePath : process.cwd();
  }

  /**
   * Get receives a file path relative to the base path set at construction
   * and returns the file contents encoded as a byte string.
   */
  async get(path: string): Promise<ByteString> {
    const validPath = this._checkPathPrefix(path);
    return fs.readFile(validPath);
  }

  /**
   * Set accepts the a file path relative to the base path along with the file
   * contents encoded as a byte string.
   */
  async set(path: string, contents: ByteString): Promise<void> {
    const validPath = this._checkPathPrefix(path);
    return fs.writeFile(validPath, contents);
  }

  /**
   * _checkPathPrefix accepts a relative file path then verifies that absolute
   * file is not outside the instance's base path. This is ensures that any
   * attempts at accessing the file system outside of the instance
   * will cause an error to throw.
   */
  _checkPathPrefix(path: string): string {
    const fullPath = normalize(pathJoin(this._basePath, path));
    // Ensure normalized path isn't outside basePath
    if (!fullPath.startsWith(this._basePath)) {
      throw new Error(
        "Path construction error; possible path traversal attack"
      );
    }
    return fullPath;
  }
}
