declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "@mantine/core/styles.css";
declare module "@mantine/notifications/styles.css";
