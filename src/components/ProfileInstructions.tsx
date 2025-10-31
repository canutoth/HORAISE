"use client";

import { useState } from "react";
import {
  Paper,
  Group,
  Box,
  Title,
  Text,
  List,
  Badge,
  Anchor,
  Collapse,
  ThemeIcon,
  UnstyledButton,
  Divider,
  Code,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
} from "@tabler/icons-react";

export default function ProfileInstructions() {
  // Mantém visível por padrão (acessível e menor custo de interação no desktop)
  const [opened, setOpened] = useState(true);

  return (
    <Paper
      shadow="sm"
      p="md"
      radius="lg"
      mb="md"
      style={{
        background: "#fff",
        border: "1px solid var(--mantine-color-gray-3)",
        color: "var(--mantine-color-dark-8)", // texto mais escuro por padrão
        lineHeight: 1.55,
      }}
    >
      {/* Header compacto e clicável */}
      <UnstyledButton
        onClick={() => setOpened((o) => !o)}
        style={{ width: "100%" }}
        aria-expanded={opened}
      >
        <Group justify="space-between">
          <Group gap="xs">
            <ThemeIcon size="lg" variant="light" color="var(--primary)">
              <IconInfoCircle size={18} />
            </ThemeIcon>
            <Title order={4} style={{ color: "var(--mantine-color-dark-9)" }}>
              Instruções de Perfil
            </Title>
            <Badge variant="light" color="gray">
              Leitura rápida
            </Badge>
          </Group>
          <Group gap="xs">
            {opened ? (
              <IconChevronUp size={18} />
            ) : (
              <IconChevronDown size={18} />
            )}
          </Group>
        </Group>
      </UnstyledButton>

      <Collapse in={opened} p="md">
        <Divider my="sm" />

        {/* Name */}
        <Box mb="md">
          <Group gap="xs" mb={6}>
            <Text
              fw={700}
              size="sm"
              style={{ color: "var(--mantine-color-dark-8)" }}
            >
              Name
            </Text>
            <Badge size="xs" color="red">
              Obrigatório
            </Badge>
          </Group>
          <List size="sm" spacing={6}>
            <List.Item>
              Informe seu nome no formato <Code>First Last</Code> (sem títulos
              como Dr., Prof., etc.). De preferência, um nome e um sobrenome.
            </List.Item>
            <List.Item>
              Comprimento: mínimo 3 caracteres, máximo 100 caracteres.
            </List.Item>
            <List.Item>
              Dicas: prefira usar o nome como quer que apareça publicamente
              (ex.: "João Silva"). Evite apelidos ou apenas iniciais.
            </List.Item>
          </List>
        </Box>

        {/* Image URL */}
        <Box mb="md">
          <Group gap="xs" mb={6}>
            <Text
              fw={700}
              size="sm"
              style={{ color: "var(--mantine-color-dark-8)" }}
            >
              Image URL
            </Text>
            <Badge size="xs" color="red">
              Obrigatório
            </Badge>
          </Group>
          <List size="sm" spacing={6}>
            <List.Item>
              Upload no{" "}
              <Anchor
                href="https://imgbox.com"
                target="_blank"
                style={{ color: "var(--mantine-color-blue-8)" }}
              >
                imgbox.com
              </Anchor>{" "}
              → cole o link em <Code>imageUrl</Code>.
            </List.Item>
            <List.Item>
              Link válido do imgbox: <Code>https://imgbox.com/XXXXXX</Code> ou
              URL direta da imagem.
            </List.Item>
            <List.Item>
              Foto 3:4 (retrato), rosto visível, boa iluminação e foco.
            </List.Item>
          </List>
        </Box>

        {/* Position */}
        <Box mb="md">
          <Group gap="xs" mb={6}>
            <Text
              fw={700}
              size="sm"
              style={{ color: "var(--mantine-color-dark-8)" }}
            >
              Position
            </Text>
            <Badge size="xs" color="red">
              Obrigatório
            </Badge>
          </Group>
          <List size="sm" spacing={6}>
            {" "}
            <Text
              size="sm"
              mb={8}
              style={{ color: "var(--mantine-color-dark-7)" }}
            >
              Escolha exatamente um (em inglês):
            </Text>
            <Group gap="xs" wrap="wrap">
              <Badge variant="outline" color="gray">
                Laboratory Head
              </Badge>
              <Badge variant="outline" color="gray">
                DSc. Candidate
              </Badge>
              <Badge variant="outline" color="gray">
                MSc. Student
              </Badge>
              <Badge variant="outline" color="gray">
                Undergraduate Student
              </Badge>
            </Group>
            <Text
              size="xs"
              style={{ color: "var(--mantine-color-dark-5)" }}
              mt={6}
            >
              Não use variações ou traduções.
            </Text>
          </List>
        </Box>

        {/* Email */}
        <Box mb="md">
          <Group gap="xs" mb={6}>
            <Text
              fw={700}
              size="sm"
              style={{ color: "var(--mantine-color-dark-8)" }}
            >
              Email
            </Text>
            <Badge size="xs" color="red">
              Obrigatório
            </Badge>
          </Group>
          <List size="sm" spacing={6}>
            <List.Item>
              Email válido (identificador único na planilha).
            </List.Item>
            <List.Item>
              Evite <Code>exemplo@example.com</Code> ou similares.
            </List.Item>
          </List>
        </Box>

        {/* Description */}
        <Box mb="md">
          <Group gap="xs" mb={6}>
            <Text
              fw={700}
              size="sm"
              style={{ color: "var(--mantine-color-dark-8)" }}
            >
              Description
            </Text>
            <Badge size="xs" color="red">
              Obrigatório
            </Badge>
          </Group>
          <List size="sm" spacing={6}>
            <List.Item>
              Sugestão de formato (opcional):{" "}
              <Code>{"<NAME> is a <POSITION> ..."}</Code>
            </List.Item>
            <List.Item>50–750 caracteres.</List.Item>
            <List.Item>
              Foque em formação, projetos, interesses e experiências.
            </List.Item>
            <List.Item>
              Ex.:{" "}
              <Text span style={{ color: "var(--mantine-color-dark-6)" }}>
                “João Silva is a MSc. Student interested in machine learning and
                computer vision...”
              </Text>
            </List.Item>
          </List>
        </Box>

        {/* Research Interests */}
        <Box mb="md">
          <Group gap="xs" mb={6}>
            <Text
              fw={700}
              size="sm"
              style={{ color: "var(--mantine-color-dark-8)" }}
            >
              Research Interests
            </Text>
            <Badge size="xs" color="red">
              Obrigatório
            </Badge>
          </Group>
          <List size="sm" spacing={6}>
            <List.Item>2–10 itens, em inglês.</List.Item>
            <List.Item>
              Ex.: “Machine Learning”, “Computer Vision”, “NLP”, “Software
              Engineering”.
            </List.Item>
          </List>
        </Box>

        {/* Technologies */}
        <Box mb="md">
          <Group gap="xs" mb={6}>
            <Text
              fw={700}
              size="sm"
              style={{ color: "var(--mantine-color-dark-8)" }}
            >
              Technologies
            </Text>
            <Badge size="xs" color="red">
              Obrigatório
            </Badge>
          </Group>
          <List size="sm" spacing={6}>
            <List.Item>3–15 itens, em inglês.</List.Item>
            <List.Item>
              Ex.: “Python”, “JavaScript”, “TensorFlow”, “React”, “Docker”,
              “AWS”.
            </List.Item>
          </List>
        </Box>

        {/* Expertise */}
        <Box mb="md">
          <Group gap="xs" mb={6}>
            <Text
              fw={700}
              size="sm"
              style={{ color: "var(--mantine-color-dark-8)" }}
            >
              Expertise
            </Text>
            <Badge size="xs" color="red">
              Obrigatório
            </Badge>
          </Group>
          <List size="sm" spacing={6}>
            <List.Item>1–8 áreas, em inglês.</List.Item>
            <List.Item>
              Ex.: “Backend Development”, “Data Science”, “Mobile Development”,
              “DevOps”.
            </List.Item>
          </List>
        </Box>

        {/* Links */}
        <Box>
          <Group gap="xs" mb={6}>
            <Text
              fw={700}
              size="sm"
              style={{ color: "var(--mantine-color-dark-8)" }}
            >
              Links Acadêmicos e Profissionais
            </Text>
            <Badge size="xs" color="gray">
              Opcional
            </Badge>
          </Group>
          <List size="sm" spacing={6}>
            <List.Item>
              Campos: <Code>lattes</Code>, <Code>personalWebsite</Code>,{" "}
              <Code>linkedin</Code>, <Code>github</Code>,{" "}
              <Code>googleScholar</Code>, <Code>orcid</Code>.
            </List.Item>
            <List.Item>Se não tiver, remova a linha.</List.Item>
            <List.Item>
              URLs começam com <Code>http://</Code> ou <Code>https://</Code>.
            </List.Item>
          </List>
        </Box>
      </Collapse>
    </Paper>
  );
}
