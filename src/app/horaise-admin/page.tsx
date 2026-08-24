"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Loader,
  Center,
} from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import TopNavBar from "@/components/TopNavBar";

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default function HoraiseAdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/admin/session");
        if (response.ok) {
          router.replace("/horaise-admin/dashboard");
          return;
        }
      } catch {
        // ignora, segue para a tela de login
      } finally {
        setChecking(false);
      }
    };
    checkSession();
  }, [router]);

  const handleGoogleLogin = () => {
    window.location.href = "/api/admin/auth/google";
  };

  if (checking) {
    return (
      <Box h="100vh" bg="#F8F9FF">
        <Center h="100%">
          <Loader size="xl" color="blue" />
        </Center>
      </Box>
    );
  }

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
                Faça login com sua conta Google para acessar
              </Text>
            </Stack>

            <Button
              fullWidth
              size="md"
              radius="md"
              onClick={handleGoogleLogin}
              leftSection={<GoogleLogo />}
              variant="default"
              style={{
                border: "1px solid #DADCE0",
                color: "#3C4043",
                fontWeight: 500,
                height: "48px",
                background: "#FFFFFF",
                "&:hover": {
                  backgroundColor: "#F8F9FA",
                },
              }}
            >
              Log in com Google
            </Button>
          </Stack>
        </Paper>
      </Box>
    </>
  );
}
