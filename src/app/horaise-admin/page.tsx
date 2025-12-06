"use client";

import React, { useState } from "react";
import {
  Box,
  Paper,
  Title,
  Text,
  PasswordInput,
  TextInput,
  Button,
  Stack,
} from "@mantine/core";
import { IconSettings, IconEye, IconEyeOff } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import TopNavBar from "@/components/TopNavBar";
import { notifications } from "@mantine/notifications";

export default function HoraiseAdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      notifications.show({
        title: "Erro",
        message: "Por favor, preencha todos os campos",
        color: "red",
        autoClose: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: "Sucesso!",
          message: "Acesso autorizado",
          color: "green",
          autoClose: 2000,
        });
        // Aqui você pode redirecionar para a página de admin real
        // router.push("/horaise-admin/dashboard");
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Senha incorreta",
          color: "red",
          autoClose: 3000,
        });
      }
    } catch (error) {
      notifications.show({
        title: "Erro",
        message: "Erro ao tentar fazer login",
        color: "red",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopNavBar />

      <Box
        style={{
          minHeight: "100vh",
          background: "#F8F9FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <Paper
          shadow="xl"
          p="xl"
          radius="lg"
          style={{
            background: "rgba(255, 255, 255, 0.98)",
            maxWidth: "450px",
            width: "100%",
            border: "2px solid rgba(142, 201, 252, 0.3)",
          }}
        >
          <Stack gap="xl" align="center">
            <Box
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "16px",
                backgroundColor: "rgba(142, 201, 252, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSettings size={40} color="#0E1862" />
            </Box>

            <Stack gap="xs" align="center">
              <Title
                order={1}
                size="h2"
                style={{
                  color: "#0E1862",
                  textAlign: "center",
                }}
              >
                Administrador
              </Title>
              <Text size="sm" c="dimmed" ta="center">
                Insira suas credenciais para acessar
              </Text>
            </Stack>

            <Stack gap="md" style={{ width: "100%" }}>
              <TextInput
                placeholder="Digite seu e-mail..."
                size="md"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleLogin();
                  }
                }}
                styles={{
                  input: {
                    border: "2px solid #E9ECEF",
                    "&:focus": {
                      borderColor: "var(--primary)",
                    },
                  },
                }}
              />

              <PasswordInput
                placeholder="Digite sua senha..."
                size="md"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleLogin();
                  }
                }}
                visibilityToggleIcon={({ reveal }) =>
                  reveal ? <IconEye size={20} /> : <IconEyeOff size={20} />
                }
                styles={{
                  input: {
                    border: "2px solid #E9ECEF",
                    "&:focus": {
                      borderColor: "var(--primary)",
                    },
                  },
                }}
              />
            </Stack>

            <Button
              fullWidth
              size="md"
              onClick={handleLogin}
              loading={loading}
              style={{
                backgroundColor: "#0E1862",
                "&:hover": {
                  backgroundColor: "#0A1145",
                },
              }}
            >
              Login
            </Button>
          </Stack>
        </Paper>
      </Box>
    </>
  );
}
