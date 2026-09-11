// One spelling for one path, for every Module that has to agree on one.
//
// A second, deliberately narrow entry point rather than a member of
// `list-markdown-files.ts`: enumerating a tree and spelling a path are
// different jobs, and a caller that only needs the second should not have to
// import a function that touches the filesystem.
//
// It lives in THIS Package because this Package is where paths come from — the
// walker's output is already in this shape, so a consumer normalising a path it
// got from here gets the same string back. It was promoted out of
// `frontmatter-harness` when a second Module and a composer all needed it:
// ARCH-004 forbids reaching into another Package's internals, so the choice was
// one implementation here or three copies, and three copies of one portable
// behaviour is the failure `named-formats` was extracted to avoid.

export { normalisePath } from './lib/path-shape.pure.ts';
