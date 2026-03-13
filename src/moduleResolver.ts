import * as path from 'path';
import { createRequire } from 'module';

const requireCache: Map<string, NodeRequire> = new Map();

/**
 * Additional module search paths configured via hsnips.modulePaths.
 */
let additionalModulePaths: string[] = [];

/**
 * Sets additional module search paths from configuration.
 */
export function setAdditionalModulePaths(paths: string[]): void {
  additionalModulePaths = paths;
}

/**
 * Creates a `require` function scoped to the given snippet file path.
 * This allows snippet files to `require()` npm packages installed in their
 * snippet directory (e.g., via `npm install` in the hsnips folder).
 *
 * Resolution order follows standard Node.js module resolution:
 *  1. Built-in Node.js modules (path, fs, os, etc.)
 *  2. node_modules in the snippet directory
 *  3. node_modules in parent directories
 *  4. Relative paths from the snippet file
 *  5. Additional paths configured via hsnips.modulePaths
 */
export function createSnippetRequire(snippetFilePath: string): NodeRequire {
  const dir = path.resolve(path.dirname(snippetFilePath));

  const cached = requireCache.get(dir);
  if (cached) {
    return cached;
  }

  // Module.createRequire creates a require function that resolves modules
  // as if they were required from the given file path.
  const baseRequire = createRequire(path.join(dir, 'index.js'));

  // Wrap to support additional module paths from configuration.
  const snippetRequire: NodeRequire = Object.assign(
    function (id: string): unknown {
      try {
        return baseRequire(id);
      } catch (e) {
        // Fallback: try each additional module path
        for (const extraPath of additionalModulePaths) {
          try {
            const altRequire = createRequire(path.join(path.resolve(extraPath), 'index.js'));
            return altRequire(id);
          } catch {
            // continue to next path
          }
        }
        throw e;
      }
    } as NodeRequire,
    { resolve: baseRequire.resolve, cache: baseRequire.cache, main: baseRequire.main }
  );

  requireCache.set(dir, snippetRequire);
  return snippetRequire;
}

/**
 * Clears the cached require functions, useful when reloading snippets.
 */
export function clearRequireCache(): void {
  requireCache.clear();
}

/**
 * Returns a set of commonly used built-in Node.js modules pre-loaded
 * for convenience in snippet global blocks and code blocks.
 */
export function getBuiltinModules(): Record<string, unknown> {
  return {
    path: require('path'),
    os: require('os'),
    util: require('util'),
    crypto: require('crypto'),
  };
}
