export {
  ancestorListings,
  copyFile,
  copyTree,
  digestFile,
  digestText,
  digestTree,
  makeDirectory,
  pathExists,
  readText,
  readTextFiles,
  removeTree,
  systemTemporaryDirectory,
  walkTree,
  writeExecutable,
  writeText,
} from './lib/platform/host-files.impure.ts';
export type { FileText, TreeEntryRecord } from './lib/platform/host-files.types.ts';
