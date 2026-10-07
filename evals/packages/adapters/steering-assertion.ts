// The grading assertion the eval tool loads by path and name. It reads the steering
// marker's specification and the arm from the provider's metadata and the final file
// from its output; it expects presence in a hook arm and the control arm, absence in
// the intent-neutralised arm, so the tool's red and green mean "behaved as
// hypothesised". The wrapper's verdict does not depend on it.
import { gradeSteeringAssertion } from './lib/assertion/steering-assertion.pure.ts';

export function gradeSteering(output: string, context: { providerResponse?: { metadata?: Record<string, unknown> } }) {
  return gradeSteeringAssertion(output, context.providerResponse?.metadata);
}
