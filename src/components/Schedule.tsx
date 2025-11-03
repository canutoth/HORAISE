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
export type ScheduleStatus = "presencial" | "ocupado" | "online" | "reuniao" | "aula" | "almoss" | null;

// Cores para cada status (RGB)
const STATUS_COLORS: Record<Exclude<ScheduleStatus, null>, string> = {
  almoss: "#FFA500",
  aula: "#A561FF",
  ocupado: "#850C10",
  online: "#D2DB6E",
  presencial: "#619A42",
  reuniao: "#3AC5E4",
};

const STATUS_LABELS: Record<Exclude<ScheduleStatus, null>, string> = {
  almoss: "Almoss",
  aula: "Aula",
  ocupado: "Ocupado",
  online: "Online",
  presencial: "Presencial",
  reuniao: "Reunião",
};

// Dias da semana
const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

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
  readOnly?: boolean; // quando true, desativa interações
  hideLegend?: boolean; // quando true, oculta a legenda
  legendWidth?: number; // largura da coluna da legenda (desktop)
  spacerWidth?: number; // largura do espaço entre legenda e calendário
  compactLegend?: boolean; // usa legenda mais fina
  centerLegendVertically?: boolean; // centraliza verticalmente a legenda no desktop
}

interface ScheduleLegendProps {
  selectedStatus: Exclude<ScheduleStatus, null> | null;
  onSelectStatus: (status: Exclude<ScheduleStatus, null>) => void;
  schedule: ScheduleData;
  readOnly?: boolean;
  compact?: boolean; // legenda mais fina
}

// Componente de Legenda (vai à esquerda)
export function ScheduleLegend({ selectedStatus, onSelectStatus, schedule, readOnly = false, compact = false }: ScheduleLegendProps) {
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
        {!readOnly && !compact && (
          <Paper p="sm" radius="md" style={{ background: "#f8f9fa" }}>
            <Text size="xs" c="dimmed">
              <strong>Como usar:</strong> Selecione um tipo abaixo e clique nas células do
              calendário à direita. Passe o mouse sobre células preenchidas para limpar.
            </Text>
          </Paper>
        )}
      <Box>
        {!readOnly && !compact && (
          <Text size="sm" fw={600} mb="xs" c="black">
            Selecione o tipo de horário:
          </Text>
        )}
        <Stack gap="xs">
          {(Object.keys(STATUS_COLORS) as Array<Exclude<ScheduleStatus, null>>).map((status) => (
            <UnstyledButton
              key={status}
              onClick={() => { if (!readOnly) onSelectStatus(status); }}
              style={{
                padding: compact ? "6px 10px" : "8px 12px",
                borderRadius: compact ? "10px" : "8px",
                border: readOnly ? "1px solid #e9ecef" : (selectedStatus === status ? "3px solid var(--primary)" : "2px solid #e9ecef"),
                background: readOnly ? "white" : (selectedStatus === status ? "#f8f9fa" : "white"),
                cursor: readOnly ? "default" : "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Box
                style={{
                  width: compact ? "16px" : "20px",
                  height: compact ? "16px" : "20px",
                  borderRadius: compact ? "3px" : "4px",
                  background: STATUS_COLORS[status],
                  border: "1px solid #dee2e6",
                }}
              />
              <Text size={compact ? "sm" : "sm"} fw={selectedStatus === status ? 600 : 400} c="black">
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
            .filter((status) => status !== "ocupado" && status !== "almoss")
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
  readOnly = false,
  hideLegend = false,
  legendWidth = 250,
  spacerWidth = 120,
  compactLegend = false,
  centerLegendVertically = false,
}: ScheduleCalendarProps) {
  const [selectedStatus, setSelectedStatus] = useState<Exclude<ScheduleStatus, null> | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  // Mobile header alignment helpers
  const dayHeaderRef = useRef<HTMLDivElement | null>(null);
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState<number>(46); // Valor inicial fixo (12px padding top + 12px padding bottom + ~22px texto)
  
  // Estados para drag (arrastar para marcar)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStatus, setDragStatus] = useState<Exclude<ScheduleStatus, null> | null>(null);

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
      if (dayHeaderRef.current && isMobile) {
        const height = dayHeaderRef.current.offsetHeight;
        if (height > 0) {
          setMobileHeaderHeight(height);
        }
      }
    };
    
    // Aguarda a renderização completa
    if (isMobile) {
      measure(); // Medição imediata
      const raf = requestAnimationFrame(measure); // Após paint
      const timeout = setTimeout(measure, 100); // Garantia extra
      
      window.addEventListener("resize", measure);
      
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timeout);
        window.removeEventListener("resize", measure);
      };
    }
  }, [isMobile]);

  // Atualiza uma célula específica
  const handleCellClick = (day: number, hour: number) => {
    // Se nenhum status está selecionado, não faz nada
    if (readOnly || !selectedStatus) return;
    
    // Imutável: cria novo objeto de dia
    const dayMap = { ...(schedule[day] || {}) };
    dayMap[hour] = selectedStatus;
    const newSchedule: ScheduleData = { ...schedule, [day]: dayMap };
    onChange(newSchedule);
  };

  // Limpa uma célula
  const handleClearCell = (day: number, hour: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (readOnly) return;
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

  // Inicia o drag
  const handleMouseDown = (day: number, hour: number) => {
    if (readOnly) return;
    
    setIsDragging(true);
    const currentStatus = getCellStatus(day, hour);
    
    if (currentStatus) {
      // Se a célula já tem status, modo de limpeza
      setDragStatus(null);
      handleClearCell(day, hour);
    } else if (selectedStatus) {
      // Se tem status selecionado, modo de pintura
      setDragStatus(selectedStatus);
      const dayMap = { ...(schedule[day] || {}) };
      dayMap[hour] = selectedStatus;
      const newSchedule: ScheduleData = { ...schedule, [day]: dayMap };
      onChange(newSchedule);
    }
  };

  // Continua o drag sobre outras células
  const handleMouseEnter = (day: number, hour: number) => {
    if (!readOnly) {
      setHoveredCell({ day, hour });
    }
    
    if (isDragging && !readOnly) {
      const currentStatus = getCellStatus(day, hour);
      
      if (dragStatus === null) {
        // Modo limpeza: remove status de células que têm
        if (currentStatus) {
          handleClearCell(day, hour);
        }
      } else {
        // Modo pintura: aplica status apenas em células vazias
        if (!currentStatus) {
          const dayMap = { ...(schedule[day] || {}) };
          dayMap[hour] = dragStatus;
          const newSchedule: ScheduleData = { ...schedule, [day]: dayMap };
          onChange(newSchedule);
        }
      }
    }
  };

  // Finaliza o drag
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStatus(null);
  };

  // Adiciona listener global para mouseup (caso solte fora do calendário)
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

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
                    onMouseDown={() => handleMouseDown(dayIdx, hour)}
                    onMouseEnter={() => handleMouseEnter(dayIdx, hour)}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{
                      position: "relative",
                      minHeight: "32px",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      background: status ? STATUS_COLORS[status] : "white",
                      cursor: isDragging ? (dragStatus ? "copy" : "not-allowed") : "pointer",
                      transition: "all 0.15s",
                      opacity: status ? 0.8 : 1,
                      pointerEvents: readOnly ? "none" : "auto",
                      userSelect: "none",
                    }}
                  >
                    {/* Botão de limpar */}
                    {status && isHovered && !readOnly && (
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
            height: `${mobileHeaderHeight}px`,
            marginBottom: "2px",
          }}
        />
        {/* Linhas de horários */}
        {HOURS.map((hour) => (
          <Box key={hour} style={{ marginBottom: "2px" }}>
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
                    onMouseDown={() => handleMouseDown(dayIdx, hour)}
                    onMouseEnter={() => handleMouseEnter(dayIdx, hour)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onTouchStart={() => handleMouseDown(dayIdx, hour)}
                    onTouchMove={(e) => {
                      // Para touch, precisamos detectar sobre qual célula está
                      const touch = e.touches[0];
                      const element = document.elementFromPoint(touch.clientX, touch.clientY);
                      if (element && element.hasAttribute('data-cell')) {
                        const cellDay = parseInt(element.getAttribute('data-day') || '0');
                        const cellHour = parseInt(element.getAttribute('data-hour') || '0');
                        handleMouseEnter(cellDay, cellHour);
                      }
                    }}
                    onTouchEnd={handleMouseUp}
                    data-cell="true"
                    data-day={dayIdx}
                    data-hour={hour}
                    style={{
                      position: "relative",
                      height: `${ROW_HEIGHT}px`,
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      background: status ? STATUS_COLORS[status] : "white",
                      cursor: isDragging ? (dragStatus ? "copy" : "not-allowed") : "pointer",
                      transition: "all 0.15s",
                      opacity: status ? 0.8 : 1,
                      pointerEvents: readOnly ? "none" : "auto",
                      userSelect: "none",
                      WebkitTouchCallout: "none",
                    }}
                  >
                    {status && isHovered && !readOnly && (
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
          {!hideLegend && (
            <Box>
              <ScheduleLegend
                selectedStatus={selectedStatus}
                onSelectStatus={(s) => {
                  if (readOnly) return;
                  setSelectedStatus(s);
                }}
                schedule={schedule}
                readOnly={readOnly}
                compact={compactLegend}
              />
            </Box>
          )}
          {/* Calendário embaixo com scroll lateral apenas nos dias */}
          {renderMobileCalendar()}
        </Stack>
      ) : (
        // Layout Desktop: Centralizado e estável
        <Box style={{ width: "100%", maxWidth: "1150px", margin: "0 auto" }}>
          <Box style={{ display: "grid", gridTemplateColumns: hideLegend ? "1fr" : `${legendWidth}px ${spacerWidth}px 1fr`, alignItems: centerLegendVertically ? "center" : "start" }}>
            {/* Painel Esquerdo - Legenda e Distribuição */}
            {!hideLegend && (
              <>
                <Box style={{ width: `${legendWidth}px` }}>
                  <ScheduleLegend
                    selectedStatus={selectedStatus}
                    onSelectStatus={(s) => {
                      if (readOnly) return;
                      setSelectedStatus(s);
                    }}
                    schedule={schedule}
                    readOnly={readOnly}
                    compact={compactLegend}
                  />
                </Box>
                {/* Espaçador */}
                <Box style={{ width: `${spacerWidth}px` }} />
              </>
            )}
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
