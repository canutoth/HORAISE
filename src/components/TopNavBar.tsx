"use client";

import { Box, Group, Text } from "@mantine/core";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

export default function TopNavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { label: "Home", path: "/" },
    { label: "Scheduler", path: "/horaise-scheduler" },
    { label: "Viewer", path: "/horaise-viewer" },
    { label: "Editor", path: "/horaise-editor" },
    { label: "|", divider: true },
    { label: "Register", path: "/horaise-register" },
    { label: "Admin", path: "/horaise-admin" },
  ];

  return (
    <Box
      style={{
        width: "100%",
        height: 96,
        background: "#DFE3F4",
        padding: "24px 24px",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <Group justify="space-between">
        <Image
          src="/horaise.png"
          alt="HORAISE Logo"
          width={320}
          height={38.5}
          style={{ cursor: "pointer" }}
          onClick={() => router.push("/")}
        />

        <Group gap="lg">
          {tabs.map((item, index) => {
            if (item.divider) {
              return (
                <Text
                  key={`divider-${index}`}
                  c="rgba(10, 35, 66, 0.6)"
                  fw={400}
                  style={{ userSelect: "none" }}
                >
                  |
                </Text>
              );
            }

            const isActive = pathname === item.path;

            return (
              <Text
                key={item.path}
                style={{ cursor: "pointer" }}
                c={isActive ? "#0E1862" : "rgba(10, 35, 66, 0.6)"}
                fw={isActive ? 600 : 500}
                onClick={() => router.push(item.path!)} 
              >
                {item.label}
              </Text>
            );
          })}
        </Group>
      </Group>
    </Box>
  );
}