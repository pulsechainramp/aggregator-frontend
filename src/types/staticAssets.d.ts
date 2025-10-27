declare module "*.png" {
  const url: string;
  export default url;
}

declare module "*.png?inline" {
  const dataUrl: string;
  export default dataUrl;
}
