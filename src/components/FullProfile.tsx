"use client";

import React from "react";
import {
  Box,
  Button,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Card,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconBulb,
  IconCode,
  IconBriefcase,
  IconCopy,
} from "@tabler/icons-react";
import type { TeamMemberData } from "../services/googleSheets";
import LinkGroup from "./LinkGroup";
import { BadgeBox } from "./BadgeBox";
import ImgboxImage from "./ImgboxImage";

interface FullProfileProps {
  member: TeamMemberData;
  imageWidth?: number;
}

export const FullProfile: React.FC<FullProfileProps> = ({
  member,
  imageWidth = 250,
}) => {
  const isMobile = useMediaQuery("(max-width: 62em)");
  const photoHeight = isMobile ? 280 : Math.round(imageWidth * 1.2);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(member.email ?? "");
      // opcional: feedback visual fica a cargo do chamador
    } catch {
      // silencioso
    }
  };

  return (
    <Card padding={isMobile ? "lg" : "xl"} radius="md" withBorder>
      <Group
        align="flex-start"
        gap={isMobile ? "lg" : "xl"}
        style={{ flexDirection: isMobile ? "column" : "row" }}
      >
        {/* Coluna da foto */}
        <Box
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: isMobile ? "100%" : imageWidth,
            flexShrink: 0,
            alignItems: "center",
          }}
        >
          <Box
            style={{
              position: "relative",
              width: "100%",
              height: photoHeight,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <ImgboxImage
              src={member.imageUrl}
              alt={member.name}
              fill
              style={{ objectFit: "cover", objectPosition: "top" }}
            />
          </Box>

          {member.email && (
            <Button
              variant="light"
              color="var(--primary)"
              rightSection={<IconCopy size={18} />}
              onClick={handleCopyEmail}
              fullWidth
              style={{ textTransform: "none", fontWeight: 600 }}
            >
              {member.email}
            </Button>
          )}
        </Box>

        {/* Coluna de conteúdo */}
        <Stack
          gap="md"
          align={isMobile ? "center" : "stretch"}
          style={{ flex: 1, minWidth: 0 }}
        >
          <Box>
            <div
              style={{
                display: "flex",
                alignItems: isMobile ? "center" : "start",
                justifyContent: isMobile ? "center" : "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  flex: isMobile ? "none" : "1 1 auto",
                  minWidth: 0,
                  textAlign: isMobile ? "center" : undefined,
                }}
              >
                <Title
                  order={1}
                  size={isMobile ? "h2" : "h1"}
                  mb="xs"
                  style={{
                    color: "var(--primary)",
                    textAlign: isMobile ? "center" : undefined,
                  }}
                >
                  {member.name}
                </Title>

                <Badge
                  size={isMobile ? "lg" : "xl"}
                  variant="light"
                  color="var(--primary)"
                  style={{
                    fontSize: isMobile ? "0.9rem" : "1rem",
                    fontWeight: 600,
                    padding: isMobile ? "12px 20px" : "14px 24px",
                  }}
                >
                  {member.position}
                </Badge>
              </div>

              <div style={{ flex: "0 0 auto" }}>
                <LinkGroup
                  links={{
                    linkedin: member.socialLinks?.linkedin,
                    github: member.socialLinks?.github,
                    googleScholar: member.socialLinks?.googleScholar,
                    orcid: member.socialLinks?.orcid,
                    lattes: member.socialLinks?.lattes,
                    personalWebsite: member.socialLinks?.personalWebsite,
                  }}
                  isMobile={isMobile}
                  align={isMobile ? "center" : "right"}
                />
              </div>
            </div>
          </Box>

          <Text
            size={isMobile ? "md" : "lg"}
            c="dimmed"
            lh={1.6}
            style={{ textAlign: isMobile ? "center" : undefined }}
          >
            {member.description}
          </Text>

          {member.researchInterests && member.researchInterests.length > 0 && (
            <BadgeBox
              title="Interesses de Pesquisa"
              icon={<IconBulb size={18} />}
              items={member.researchInterests}
            />
          )}

          {(member.technologies?.length || member.expertise?.length) && (
            <Group
              grow
              align="stretch"
              gap="md"
              style={{ flexDirection: isMobile ? "column" : "row" }}
            >
              {member.technologies && member.technologies.length > 0 && (
                <BadgeBox
                  title="Tecnologias"
                  icon={<IconCode size={18} />}
                  items={member.technologies}
                />
              )}

              {member.expertise && member.expertise.length > 0 && (
                <BadgeBox
                  title="Expertise"
                  icon={<IconBriefcase size={18} />}
                  items={member.expertise}
                />
              )}
            </Group>
          )}
        </Stack>
      </Group>
    </Card>
  );
};

export default FullProfile;
