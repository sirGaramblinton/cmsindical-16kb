declare module '@tensorflow/tfjs-core' {
  const tf: any;
  export = tf;
}

declare module '@tensorflow-models/face-landmarks-detection' {
  export function createDetector(...args: any[]): any;
  export const SupportedModels: any;
  const _default: any;
  export default _default;
}
