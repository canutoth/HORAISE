"use client";

import { Suspense, useEffect } from "react";
import { Box, Paper, Title, Text, Stack } from "@mantine/core";
import { IconLogin } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import TopNavBar from "@/components/TopNavBar";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { fetchAuthSession } from "@/hooks/useAuthSession";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    document.title = "HORAISE | Login";
  }, []);

  useEffect(() => {
    const decideDestination = async () => {
      const session = await fetchAuthSession();
      if (!session) return;

      const redirect = searchParams.get("redirect");
      if (redirect && redirect.startsWith("/")) {
        router.replace(redirect);
        return;
      }

      router.replace(
        session.role === "admin"
          ? "/admin"
          : `/edit-content/${encodeURIComponent(session.email)}`
      );
    };
    decideDestination();
  }, [router, searchParams]);

  return (
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
            <IconLogin size={40} color="#0E1862" />
          </Box>

          <Stack gap="xs" align="center">
            <Title
              order={1}
              size="h2"
              style={{ color: "#0E1862", textAlign: "center" }}
            >
              Entrar
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              Faça login para acessar o HorAISE
            </Text>
          </Stack>

          <GoogleLoginButton />

        </Stack>
      </Paper>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <>
      <TopNavBar />
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}