"use client";

import { Box, Title, Text } from "@mantine/core";

export default function HoraiseAdminPage() {
  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "var(--primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
      }}
    >
      <Title
        order={1}
        style={{
          color: "white",
          fontSize: "clamp(2rem, 6vw, 3.5rem)",
          letterSpacing: "1px",
          marginBottom: "12px",
        }}
      >
        HORAISE Admin
      </Title>
      <Text c="white" fz="sm" opacity={0.8}>
        Área de administração (em construção)
      </Text>
    </Box>
  );
}
