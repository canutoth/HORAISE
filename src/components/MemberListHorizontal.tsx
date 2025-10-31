"use client";

import React, { useState } from "react";
import { Card, Box, Text, Stack } from "@mantine/core";
import { motion } from "framer-motion";
import ImgboxImage from "./ImgboxImage";
import type { TeamMemberData } from "../services/googleSheets";

interface MemberListItemProps {
  member: TeamMemberData;
  index?: number;
}

export const MemberListHorizontal: React.FC<MemberListItemProps> = ({
  member,
  index = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Card
        padding="md"
        radius="md"
        withBorder
        style={{
          cursor: "pointer",
          transition: "all 0.3s ease",
          borderColor: isHovered ? "var(--primary)" : "#e9ecef",
          backgroundColor: "#ffffff",
          transform: isHovered ? "translateY(-4px)" : "translateY(0)",
          boxShadow: isHovered
            ? "0 4px 12px rgba(0, 123, 255, 0.2)"
            : "0 1px 3px rgba(0, 0, 0, 0.05)",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Stack gap="sm" align="center">
          {/* Imagem */}
          <Box
            style={{
              width: 100,
              height: 100,
              borderRadius: 8,
              overflow: "hidden",
              background: "#f5f5f5",
              flex: "0 0 auto",
              position: "relative", // <- necessário para Image com fill
              aspectRatio: "1 / 1", // <- mantém 1:1 (opcional, ajuda em responsivo)
            }}
          >
            <ImgboxImage
              src={member.imageUrl}
              alt={`Foto de ${member.name}`}
              fill
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
          </Box>

          <Box style={{ textAlign: "center", width: "100%", minWidth: 0 }}>
            <Text fw={600} size="lg" style={{ color: "var(--primary)" }}>
              {member.name}
            </Text>
            <Text size="sm" c="dimmed" lineClamp={3} style={{ marginTop: 4 }}>
              {member.description}
            </Text>
          </Box>
        </Stack>

        <Box
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "var(--primary)",
            color: "#ffffff",
            padding: 8,
            textAlign: "center",
            transform: isHovered ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.3s ease",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          Ver mais
        </Box>
      </Card>
    </motion.div>
  );
};

export default MemberListHorizontal;
