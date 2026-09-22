// The composition boundary for one path's per-Module assessments.
//
// Exposed narrowly so the Conformance runner exercises the same whole-config
// decision as the command instead of reproducing `ungoverned` from a marker.

export { pathAssessment } from './lib/run/path-assessment.pure.ts';
