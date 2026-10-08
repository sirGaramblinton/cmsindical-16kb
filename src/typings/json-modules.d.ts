declare module '@/assets/*.json' {
  const value: any;
  export default value;
}

declare module '@/assets/fonts/*.json' {
  const value: any;
  export default value;
}

declare module '*.json' {
  const value: any;
  export default value;
}

// Explicit declarations for specific imports that sometimes fail to resolve.
declare module '@/assets/env.json' {
  const value: any;
  export default value;
}

declare module '@/assets/fonts/icons.json' {
  const value: any;
  export default value;
}
