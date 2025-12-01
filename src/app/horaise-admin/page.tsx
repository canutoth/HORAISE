"use client";
import { Box, Title, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function HoraiseAdminPage() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Verifica se há mensagem de sucesso ou erro na URL
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    
    if (success) {
      notifications.show({
        title: "Sucesso!",
        message: success,
        color: "green",
        autoClose: 5000,
      });
    }
    
    if (error) {
      notifications.show({
        title: "Erro",
        message: error,
        color: "red",
        autoClose: 5000,
      });
    }
  }, [searchParams]);
  
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
