"use client";

import { useState } from "react";
import {
  Box,
  Paper,
  Group,
  Stack,
  Text,
  Button,
  UnstyledButton,
  Badge,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";

// Tipos de status para cada célula
export type ScheduleStatus = "presencial" | "ocupado" | "online" | "reuniao" | "aula" | null;

// Cores para cada status (RGB)
const STATUS_COLORS: Record<Exclude<ScheduleStatus, null>, string> = {
  presencial: "rgb(0, 255, 0)",
  ocupado: "rgb(255, 0, 0)",
  online: "rgb(242, 227, 7)",
  reuniao: "rgb(0, 0, 255)",
  aula: "rgb(0, 255, 251)",
};

const STATUS_LABELS: Record<Exclude<ScheduleStatus, null>, string> = {
  presencial: "Presencial",
  ocupado: "Ocupado",
  online: "Online",
  reuniao: "Reunião",
  aula: "Aula",
};

// Dias da semana
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Horários (7h às 20h) - representando intervalos
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 a 19

export interface ScheduleData {
  [day: number]: {
    [hour: number]: ScheduleStatus;
  };
}

interface ScheduleCalendarProps {
  schedule: ScheduleData;
  onChange: (schedule: ScheduleData) => void;
}

interface ScheduleLegendProps {
  selectedStatus: Exclude<ScheduleStatus, null>;
  onSelectStatus: (status: Exclude<ScheduleStatus, null>) => void;
  schedule: ScheduleData;
}

// Componente de Legenda (vai à esquerda)
export function ScheduleLegend({ selectedStatus, onSelectStatus, schedule }: ScheduleLegendProps) {
  // Calcula o total de horas para cada tipo (exceto ocupado)
  const calculateHours = (status: Exclude<ScheduleStatus, null>): number => {
    let count = 0;
    Object.values(schedule).forEach((daySchedule) => {
      Object.values(daySchedule).forEach((cellStatus) => {
        if (cellStatus === status) count++;
      });
    });
    return count;
  };
  return (
    <Stack gap="md">
        <Paper p="sm" radius="md" style={{ background: "#f8f9fa" }}>
        <Text size="xs" c="dimmed">
            <strong>Como usar:</strong> Selecione um tipo abaixo e clique nas células do
            calendário à direita. Passe o mouse sobre células preenchidas para limpar.
        </Text>
        </Paper>
      <Box>
        <Text size="sm" fw={600} mb="xs" c="black">
          Selecione o tipo de horário:
        </Text>
        <Stack gap="xs">
          {(Object.keys(STATUS_COLORS) as Array<Exclude<ScheduleStatus, null>>).map((status) => (
            <UnstyledButton
              key={status}
              onClick={() => onSelectStatus(status)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: selectedStatus === status ? "3px solid #228BE6" : "2px solid #e9ecef",
                background: selectedStatus === status ? "#f8f9fa" : "white",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Box
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "4px",
                  background: STATUS_COLORS[status],
                  border: "1px solid #dee2e6",
                }}
              />
              <Text size="sm" fw={selectedStatus === status ? 600 : 400} c="black">
                {STATUS_LABELS[status]}
              </Text>
            </UnstyledButton>
          ))}
        </Stack>
      </Box>

      {/* Total de horas por tipo */}
      <Box>
        <Text size="sm" fw={600} mb="xs" c="black">
          Distribuição de horas:
        </Text>
        <Stack gap={4}>
          {(Object.keys(STATUS_COLORS) as Array<Exclude<ScheduleStatus, null>>)
            .filter((status) => status !== "ocupado")
            .map((status) => {
              const hours = calculateHours(status);
              return (
                <Group key={status} gap="xs" justify="space-between">
                  <Group gap="xs">
                    <Box
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "2px",
                        background: STATUS_COLORS[status],
                        border: "1px solid #dee2e6",
                      }}
                    />
                    <Text size="xs" c="dimmed">
                      {STATUS_LABELS[status]}
                    </Text>
                  </Group>
                  <Text size="xs" fw={600} c="black">
                    {hours}h
                  </Text>
                </Group>
              );
            })}
        </Stack>
      </Box>

    </Stack>
  );
}

export default function ScheduleCalendar({
  schedule,
  onChange,
}: ScheduleCalendarProps) {
  const [selectedStatus, setSelectedStatus] = useState<Exclude<ScheduleStatus, null>>("presencial");
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);

  // Atualiza uma célula específica
  const handleCellClick = (day: number, hour: number) => {
    const newSchedule = { ...schedule };
    if (!newSchedule[day]) {
      newSchedule[day] = {};
    }
    
    // Sempre aplica o status selecionado (não faz toggle)
    newSchedule[day][hour] = selectedStatus;
    
    onChange(newSchedule);
  };

  // Limpa uma célula
  const handleClearCell = (day: number, hour: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSchedule = { ...schedule };
    if (newSchedule[day]) {
      newSchedule[day][hour] = null;
    }
    onChange(newSchedule);
  };

  // Pega o status de uma célula
  const getCellStatus = (day: number, hour: number): ScheduleStatus => {
    return schedule[day]?.[hour] || null;
  };

  return (
    <Group align="flex-start" gap="120px" wrap="nowrap">
      {/* Painel Esquerdo - Legenda e Distribuição */}
      <Box style={{ minWidth: "250px", maxWidth: "250px" }}>
        <ScheduleLegend selectedStatus={selectedStatus} onSelectStatus={setSelectedStatus} schedule={schedule} />
      </Box>

      {/* Painel Direito - Calendário Interativo */}
      <Box
        style={{
          flex: 1,
          overflowX: "auto",
        }}
      >
        <Box style={{ minWidth: "580px", maxWidth: "800px" }}>
          {/* Cabeçalho dos dias */}
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "80px repeat(7, 100px)",
              gap: "2px",
              marginBottom: "2px",
              position: "sticky",
              top: 0,
              background: "white",
              zIndex: 10,
            }}
          >
            <Box /> {/* Célula vazia no canto */}
            {WEEKDAYS.map((day, idx) => (
              <Box
                key={idx}
                style={{
                  padding: "12px 8px",
                  textAlign: "center",
                  background: "#228BE6",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "14px",
                  borderRadius: "4px",
                }}
              >
                {day}
              </Box>
            ))}
          </Box>

          {/* Linhas de horários */}
          {HOURS.map((hour) => (
            <Box
              key={hour}
              style={{
                display: "grid",
                gridTemplateColumns: "80px repeat(7, 100px)",
                gap: "2px",
                marginBottom: "2px",
              }}
            >
              {/* Célula de horário */}
              <Box
                style={{
                  padding: "8px",
                  textAlign: "center",
                  background: "#f8f9fa",
                  fontWeight: 600,
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                  color: "#495057",
                }}
              >
                {String(hour).padStart(2, '0')}h-{String(hour + 1).padStart(2, '0')}h
              </Box>

              {/* Células dos dias */}
              {WEEKDAYS.map((_, dayIdx) => {
                const status = getCellStatus(dayIdx, hour);
                const isHovered = hoveredCell?.day === dayIdx && hoveredCell?.hour === hour;

                return (
                  <UnstyledButton
                    key={dayIdx}
                    onClick={() => handleCellClick(dayIdx, hour)}
                    onMouseEnter={() => setHoveredCell({ day: dayIdx, hour })}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{
                      position: "relative",
                      minHeight: "32px",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      background: status ? STATUS_COLORS[status] : "white",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      opacity: status ? 0.8 : 1,
                    }}
                  >
                    {/* Botão de limpar */}
                    {status && isHovered && (
                      <Box
                        onClick={(e) => handleClearCell(dayIdx, hour, e)}
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "rgba(0, 0, 0, 0.6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          zIndex: 5,
                        }}
                      >
                        <IconX size={14} color="white" />
                      </Box>
                    )}
                  </UnstyledButton>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
    </Group>
  );
}
