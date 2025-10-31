"use client";

import React, { useState } from "react";
import { Card, Group, Box, Text } from "@mantine/core";
import type { TeamMemberData } from "../services/googleSheets";
import ImgboxImage from "./ImgboxImage";

interface MemberListItemProps {
  member: TeamMemberData;
  avatarSize?: number;
}

export const MemberListHorizontal: React.FC<MemberListItemProps> = ({
  member,
  avatarSize = 90,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      padding="md"
      radius="md"
      withBorder
      style={{
        cursor: "pointer",
        transition: "all 0.3s ease",
        borderColor: "#e9ecef",
        backgroundColor: "#ffffff",
        boxShadow: "none",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Group gap="md" wrap="nowrap" align="center">
        {/* Imagem com ImgboxImage */}
        <Box
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: 8,
            overflow: "hidden",
            background: "#f5f5f5",
            flex: "0 0 auto",
          }}
        >
          <ImgboxImage
            src={member.imageUrl}
            alt={member.name}
            width={avatarSize}
            height={avatarSize}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            className=""
          />
        </Box>

        {/* Texto */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text
            fw={600}
            size="lg"
            // cor primária como no grid item
            style={{ color: "var(--primary)" }}
            truncate
          >
            {member.name}
          </Text>

          {/* cargo opcional, discreto */}

          {member.position && (
            <Text
              size="sm"
              c="dimmed"
              mb="xs"
              truncate
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {member.description}
            </Text>
          )}
        </Box>
      </Group>
    </Card>
  );
};

export default MemberListHorizontal;
