"use client";

import React from "react";
import { Card, Text, Box, ActionIcon } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { motion } from "framer-motion";
import ImgboxImage from "./ImgboxImage";

export interface PersonCardProps {
  name: string;
  position: string;
  imageUrl: string;
  description?: string;
  cardWidth?: number;
  roles?: string[];
}

const MotionCard = motion(Card as any);
const MotionBox = motion(Box as any);

// Variantes para o overlay no hover
const overlayVariants = {
  rest: { opacity: 0, y: 8, transition: { duration: 0.15 } },
  hover: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 22 },
  },
};

export const PersonCard: React.FC<PersonCardProps> = ({
  name,
  position,
  imageUrl,
  cardWidth = 280,
  roles,
}) => {
  const isMobile = cardWidth < 200;
  const imageHeight = Math.floor(cardWidth);
  const cardHeight = imageHeight + 100;

  return (
    <MotionCard
      shadow="md"
      radius="xl"
      p={0}
      style={{
        overflow: "hidden",
        cursor: "pointer",
        background: "white",
        minHeight: cardHeight,
        width: cardWidth,
        margin: "0 auto",
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      initial="rest"
      animate="rest"
      whileHover="hover"
      role="button"
      aria-label={`Abrir perfil de ${name}`}
      title={`Abrir perfil de ${name}`}
    >
      {/* Container da imagem */}
      <Box
        style={{
          position: "relative",
          height: imageHeight,
          width: "100%",
          overflow: "hidden",
        }}
      >
        <ImgboxImage
          src={imageUrl}
          alt={`Foto de ${name}`}
          fill
          style={{
            objectFit: "cover",
            objectPosition: "top",
          }}
        />

        {/* Overlay gradient sutil na base */}
        <Box
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: "linear-gradient(to top, rgba(0,0,0,0.3), transparent)",
          }}
        />

        {/* Overlay informativo no hover */}
        <MotionBox
          variants={overlayVariants}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.55))",
            backdropFilter: "blur(2px)",
            pointerEvents: "none",
          }}
        >
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.35)",
              background: "rgba(0,0,0,0.25)",
            }}
          >
            <Text
              c="white"
              fw={700}
              size={isMobile ? "xs" : "sm"}
              lh={1}
              style={{ letterSpacing: 0.2 }}
            >
              Ver perfil
            </Text>
            <ActionIcon
              variant="light"
              color="var(--primary)"
              radius="xl"
              size={isMobile ? "sm" : "md"}
              aria-hidden
              style={{ pointerEvents: "none" }}
            >
              <IconArrowRight size={16} />
            </ActionIcon>
          </Box>
        </MotionBox>
      </Box>

      {/* Informações */}
      <Box p={isMobile ? "md" : "lg"} ta="center">
        <Text
          fw={700}
          size={isMobile ? "sm" : "lg"}
          mb="xs"
          c="dark.7"
          lh={1.3}
        >
          {name}
        </Text>

        <Text
          size={isMobile ? "xs" : "sm"}
          c="dimmed"
          mb={roles && roles.length > 0 ? "xs" : "xs"}
          lh={1.4}
          fw={500}
        >
          {position}
        </Text>

        {/* Tags de roles */}
        {roles && roles.length > 0 && (
          <Box
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: isMobile ? 4 : 6,
              justifyContent: "center",
              marginTop: 8,
            }}
          >
            {roles.map((role, idx) => (
              <Box
                key={idx}
                style={{
                  fontSize: isMobile ? "9px" : "10px",
                  fontWeight: 600,
                  padding: isMobile ? "3px 8px" : "4px 10px",
                  borderRadius: 12,
                  backgroundColor: "#52afe11f",
                  color: "var(--primary)",
                  letterSpacing: "0.3px",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                {role}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </MotionCard>
  );
};

export default PersonCard;
