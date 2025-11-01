"use client";

import { useState, useEffect, useRef } from "react";
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
  aula: "#A561FF",
  ocupado: "#850C10",
  online: "#D2DB6E",
  presencial: "#619A42",
  reuniao: " #3AC5E4",
};

const STATUS_LABELS: Record<Exclude<ScheduleStatus, null>, string> = {
  aula: "Aula",
  ocupado: "Ocupado",
  online: "Online",
  presencial: "Presencial",
  reuniao: "Reunião",
};

// Dias da semana
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Dimensões base do grid
const TIME_COL_WIDTH = 80; // px
const DAY_COL_WIDTH = 100; // px
const CALENDAR_WIDTH = TIME_COL_WIDTH + 7 * DAY_COL_WIDTH; // 780px
const ROW_HEIGHT = 32; // px - altura uniforme das linhas no mobile

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
                border: selectedStatus === status ? "3px solid var(--primary)" : "2px solid #e9ecef",
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
  const [isMobile, setIsMobile] = useState(false);
  // Mobile header alignment helpers
  const dayHeaderRef = useRef<HTMLDivElement | null>(null);
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState<number>(0);

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Measure the mobile days header height to align the fixed time header
  useEffect(() => {
    const measure = () => {
      if (dayHeaderRef.current) {
        setMobileHeaderHeight(dayHeaderRef.current.offsetHeight);
      }
    };
    // Initial measure after paint
    const raf = requestAnimationFrame(measure);
    // Recalculate on resize
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Atualiza uma célula específica
  const handleCellClick = (day: number, hour: number) => {
    // Imutável: cria novo objeto de dia
    const dayMap = { ...(schedule[day] || {}) };
    dayMap[hour] = selectedStatus;
    const newSchedule: ScheduleData = { ...schedule, [day]: dayMap };
    onChange(newSchedule);
  };

  // Limpa uma célula
  const handleClearCell = (day: number, hour: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (schedule[day]) {
      const dayMap = { ...(schedule[day] || {}) };
      dayMap[hour] = null;
      const newSchedule: ScheduleData = { ...schedule, [day]: dayMap };
      onChange(newSchedule);
    }
  };

  // Pega o status de uma célula
  const getCellStatus = (day: number, hour: number): ScheduleStatus => {
    return schedule[day]?.[hour] || null;
  };

  // Renderiza o calendário (desktop)
  const renderCalendar = () => (
    <Box style={{ minWidth: `${CALENDAR_WIDTH}px`, maxWidth: `${CALENDAR_WIDTH}px` }}>
          {/* Cabeçalho dos dias */}
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(7, ${DAY_COL_WIDTH}px)`,
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
                  background: "var(--primary)",
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
                gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(7, ${DAY_COL_WIDTH}px)`,
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
  );

  // Renderiza o calendário para mobile com coluna de horário fixa
  const renderMobileCalendar = () => (
    <Box style={{ display: "flex", width: "100%" }}>
      {/* Coluna fixa de horários */}
      <Box style={{ width: `${TIME_COL_WIDTH}px`, flex: "0 0 auto" }}>
        {/* Cabeçalho vazio alinhado com os dias */}
        <Box
          style={{
            padding: "12px 8px",
            background: "white",
            position: "sticky",
            top: 0,
            zIndex: 11,
            height: mobileHeaderHeight ? `${mobileHeaderHeight}px` : undefined,
            marginBottom: "2px",
          }}
        />
        {/* Linhas de horários */}
        {HOURS.map((hour) => (
          <Box
            key={hour}
            style={{
              marginBottom: "2px",
            }}
          >
            <Box
              style={{
                height: `${ROW_HEIGHT}px`,
                textAlign: "center",
                background: "#f8f9fa",
                fontWeight: 600,
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                color: "#495057",
                border: "1px solid #dee2e6",
              }}
            >
              {String(hour).padStart(2, '0')}h-{String(hour + 1).padStart(2, '0')}h
            </Box>
          </Box>
        ))}
      </Box>

      {/* Grid scrollável dos dias */}
      <Box
        style={{
          overflowX: "auto",
          overflowY: "hidden",
          width: "100%",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Box style={{ minWidth: `${7 * DAY_COL_WIDTH}px` }}>
          {/* Cabeçalho dos dias */}
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(7, ${DAY_COL_WIDTH}px)`,
              gap: "2px",
              marginBottom: "2px",
              position: "sticky",
              top: 0,
              background: "white",
              zIndex: 10,
            }}
          >
            {WEEKDAYS.map((day, idx) => (
              <Box
                key={idx}
                ref={idx === 0 ? dayHeaderRef : undefined}
                style={{
                  padding: "12px 8px",
                  textAlign: "center",
                  background: "var(--primary)",
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

          {/* Linhas de horários (apenas dias, sem coluna de hora) */}
          {HOURS.map((hour) => (
            <Box
              key={hour}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(7, ${DAY_COL_WIDTH}px)`,
                gap: "2px",
                marginBottom: "2px",
              }}
            >
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
                      height: `${ROW_HEIGHT}px`,
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      background: status ? STATUS_COLORS[status] : "white",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      opacity: status ? 0.8 : 1,
                    }}
                  >
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
    </Box>
  );

  return (
    <Box>
      {isMobile ? (
        // Layout Mobile: Empilhado verticalmente com coluna de horários fixa
        <Stack gap="lg">
          {/* Legenda em cima */}
          <Box>
            <ScheduleLegend selectedStatus={selectedStatus} onSelectStatus={setSelectedStatus} schedule={schedule} />
          </Box>
          {/* Calendário embaixo com scroll lateral apenas nos dias */}
          {renderMobileCalendar()}
        </Stack>
      ) : (
        // Layout Desktop: Centralizado e estável
        <Box style={{ width: "100%", maxWidth: "1150px", margin: "0 auto" }}>
          <Box style={{ display: "grid", gridTemplateColumns: "250px 120px 1fr", alignItems: "start" }}>
            {/* Painel Esquerdo - Legenda e Distribuição */}
            <Box style={{ width: "250px" }}>
              <ScheduleLegend selectedStatus={selectedStatus} onSelectStatus={setSelectedStatus} schedule={schedule} />
            </Box>
            {/* Espaçador */}
            <Box />
            {/* Painel Direito - Calendário Interativo (sem scroll no desktop) */}
            <Box style={{ overflow: "visible" }}>
              <Box style={{ width: `${CALENDAR_WIDTH}px`, margin: "0 auto" }}>
                {renderCalendar()}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
