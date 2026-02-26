"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Alert,
  Loader,
  Center,
  Grid,
  Badge,
  MultiSelect,
  ActionIcon,
  Modal,
  SimpleGrid,
  ThemeIcon,
  Table,
  HoverCard,
  Divider,
  UnstyledButton,
  List,
  ScrollArea,
  Tabs,
  TextInput,
  NumberInput, 
  ScrollArea,
  Tabs,
  TextInput,
  NumberInput, 
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks"; 
import {
  IconDeviceFloppy,
  IconRefresh,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconArrowLeft,
  IconPencil,
  IconLock,
  IconSchool,
  IconDeviceLaptop,
  IconBuildingSkyscraper,
  IconUsers,
  IconClock,
  IconBan,
  IconAlertTriangle,
  IconInfoCircle,
  IconToolsKitchen2, 
} from "@tabler/icons-react";
import { useRouter, useParams } from "next/navigation";
import { notifications } from "@mantine/notifications";
import {
  getMemberByEmail,
  getExampleData,
  saveMember,
  validateMemberData,
  getBacklogOptions,
  loadSuggestedScheduleFromSheet,
  acceptSuggestedSchedule,
  loadSuggestedScheduleFromSheet,
  acceptSuggestedSchedule,
  type TeamMemberData,
  type ScheduleData,
} from "../../../services/googleSheets";
import { validateSchedule, type RuleViolation } from "@/rules/scheduleRules";
import TopNavBar from "@/components/TopNavBar";

const WEEKDAY_UI_INDICES = [0, 1, 2, 3, 4, 5, 6];
const DAY_LABELS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HOURS_DISPLAY = Array.from({ length: 13 }, (_, i) => i + 7);
const ROW_HEIGHT = "40px";

export default function EditContentPage() {
  const router = useRouter();
  const params = useParams();
  const personId = decodeURIComponent(params?.personid as string);

  const isMobile = useMediaQuery('(max-width: 768px)');

  const [memberData, setMemberData] = useState<TeamMemberData | null>(null);
  const [schedule, setSchedule] = useState<ScheduleData>({});
  const [savedSchedule, setSavedSchedule] = useState<ScheduleData>({});
  const [suggestedSchedule, setSuggestedSchedule] = useState<ScheduleData | null>(null);
  const [activeTab, setActiveTab] = useState<"original" | "suggested">("original");
  const [isAcceptingSuggestion, setIsAcceptingSuggestion] = useState(false);
  const [suggestedSchedule, setSuggestedSchedule] = useState<ScheduleData | null>(null);
  const [activeTab, setActiveTab] = useState<"original" | "suggested">("original");
  const [isAcceptingSuggestion, setIsAcceptingSuggestion] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewMember, setIsNewMember] = useState(false);
  const [isEditingFrentes, setIsEditingFrentes] = useState(false);
  const [editedFrentes, setEditedFrentes] = useState<string[]>([]);
  const [isEditingHP, setIsEditingHP] = useState(false);
  const [editedHP, setEditedHP] = useState<string>("");
  const [isEditingHO, setIsEditingHO] = useState(false);
  const [editedHO, setEditedHO] = useState<string>("");
  const [isEditingHP, setIsEditingHP] = useState(false);
  const [editedHP, setEditedHP] = useState<string>("");
  const [isEditingHO, setIsEditingHO] = useState(false);
  const [editedHO, setEditedHO] = useState<string>("");
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [rulesViolations, setRulesViolations] = useState<RuleViolation[]>([]);
  const [isRequestingException, setIsRequestingException] = useState(false);
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  
  const [dynamicRules, setDynamicRules] = useState<{
    minimoSlotsConsecutivos: number;
    minimoSlotsDiariosPresencial: number;
    intervaloAlmoco: string;
    inicio: number;
    fim: number;
  } | null>(null);
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [frentesOptions, setFrentesOptions] = useState<string[]>([]);
  const [frentesEmojis, setFrentesEmojis] = useState<Record<string, string>>({});
  const [bolsasColors, setBolsasColors] = useState<Record<string, string>>({}); 

  const hp = memberData?.hp ? parseFloat(memberData.hp) : 0;
  const ho = memberData?.ho ? parseFloat(memberData.ho) : 0;

  useEffect(() => {
    document.title = `HORAISE | Editor`;
  }, []);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const options = await getBacklogOptions();
        setFrentesOptions(options.frentes.map(f => f.name));
        
        const emojiMap: Record<string, string> = {};
        options.frentes.forEach(f => {
          emojiMap[f.name] = f.emoji;
        });
        setFrentesEmojis(emojiMap);

        const colorMap: Record<string, string> = {};
        options.bolsas.forEach(b => {
          colorMap[b.name] = b.color;
        });
        setBolsasColors(colorMap);
        
        const rulesResponse = await fetch("/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "read-rules" }),
        });
        const rulesData = await rulesResponse.json();
        if (rulesData.success && rulesData.rules) {
          setDynamicRules(rulesData.rules);
        }
      } catch (error) {
        console.error("Erro ao carregar opções:", error);
      }
    };
    loadOptions();
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchend", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, []);

  const cloneSchedule = (s: ScheduleData): ScheduleData => JSON.parse(JSON.stringify(s || {}));

  const statusToCode = (st: any): string => {
    switch (st) {
      case "aula": return "A";
      case "presencial": return "P";
      case "online": return "O";
      case "ocupado": return "X";
      case "reuniao": return "R";
      case "almoco": return "L";
      default: return "";
    }
  };

  const toCanonicalString = (s: ScheduleData): string => {
    const parts: string[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 7; hour <= 19; hour++) {
        const st = s?.[day]?.[hour] ?? null;
        parts.push(statusToCode(st));
      }
    }
    return parts.join("|");
  };

  const handleCellClick = (day: number, hour: number) => {
    setSchedule((prev) => {
      const newSchedule = JSON.parse(JSON.stringify(prev));
      if (!newSchedule[day]) newSchedule[day] = {};
      
      const currentStatus = newSchedule[day][hour];
      let nextStatus: string | null = null;

      if (activeTool) {
        if (currentStatus) {
          nextStatus = null;
        } else {
          nextStatus = activeTool;
        }
      }
      
      if (nextStatus) {
        newSchedule[day][hour] = nextStatus;
      } else {
        delete newSchedule[day][hour];
      }
      
      return newSchedule;
    });
  };
  
  const applyPaint = (day: number, hour: number) => {
    setSchedule((prev) => {
        const newSchedule = JSON.parse(JSON.stringify(prev));
        if (!newSchedule[day]) newSchedule[day] = {};
        if (activeTool) {
            newSchedule[day][hour] = activeTool;
        } else {

        }

        return newSchedule;
    });
  };

  const handleMouseDown = (day: number, hour: number, e: React.MouseEvent) => {
    e.preventDefault(); 
    setIsDragging(true);
    handleCellClick(day, hour);
  };

  const handleMouseEnter = (day: number, hour: number) => {
    if (isDragging && activeTool) {
         applyPaint(day, hour);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "presencial": return { color: "green", label: isMobile ? "P" : "Presencial" }; 
      case "online": return { color: "teal", label: isMobile ? "O" : "Online" };
      case "reuniao": return { color: "orange", label: isMobile ? "R" : "Reunião" };
      case "aula": return { color: "blue", label: isMobile ? "A" : "Aula" };
      case "ocupado": return { color: "red", label: isMobile ? "X" : "Ocupado" };
      case "almoco": return { color: "yellow", label: isMobile ? "L" : "Almoço" };
      default: return null;
    }
  };

  useEffect(() => {
    const loadMemberData = async () => {
      setIsLoading(true);
      try {
        if (typeof window !== "undefined") {
          const loggedEmail = sessionStorage.getItem("adminEmail");
          if (loggedEmail) {
            const checkAdmin = await fetch("/api", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "admin-precheck", email: loggedEmail }),
            });
            const result = await checkAdmin.json();
            if (result.isAdmin && loggedEmail.toLowerCase() !== personId.toLowerCase()) {
              setIsAdminMode(true);
              setAdminEmail(loggedEmail);
            }
          }
        }

        if (typeof window !== "undefined") {
          const newMemberData = sessionStorage.getItem("newMember");
          const isNew = sessionStorage.getItem("isNewMember") === "true";

          if (isNew && newMemberData) {
            const member = JSON.parse(newMemberData) as TeamMemberData;
            setMemberData(member);
            const memberSchedule = member.schedule || {};
            setSchedule(memberSchedule);
            setSavedSchedule(cloneSchedule(memberSchedule));
            setIsNewMember(true);
            sessionStorage.removeItem("newMember");
            sessionStorage.removeItem("isNewMember");
            setIsLoading(false);
            return;
          }
        }

        const member = await getMemberByEmail(personId);
        if (member) {
          if (member.editor !== 1) {
            const isPending = member.pendingAccess === 1;
            const errorMsg = isPending
              ? "Seu cadastro está pendente de aprovação."
              : "Você não tem permissão para editar.";
            
            notifications.show({ title: "Acesso Negado", message: errorMsg, color: "red", icon: <IconLock />, autoClose: 5000 });
            setTimeout(() => router.push("/horaise-editor"), 2000);
            return;
          }
          setMemberData(member);
          const memberSchedule = member.schedule || {};
          setSchedule(memberSchedule);
          setSavedSchedule(cloneSchedule(memberSchedule));
          setIsNewMember(false);
          
          if (member.pendingSuggestion === 1) {
            try {
              const suggested = await loadSuggestedScheduleFromSheet(personId);
              if (suggested) {
                setSuggestedSchedule(suggested);
                setActiveTab("suggested"); 
              }
            } catch (suggError) {
              console.warn("Erro ao carregar sugestão:", suggError);
            }
          }
        } else {
          const exampleData = await getExampleData();
          const newMember: TeamMemberData = { ...exampleData, email: personId };
          setMemberData(newMember);
          const exampleSchedule = newMember.schedule || {};
          setSchedule(exampleSchedule);
          setSavedSchedule(cloneSchedule(exampleSchedule));
          setIsNewMember(true);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        notifications.show({ title: "Erro", message: "Erro ao carregar dados.", color: "red" });
        setTimeout(() => router.push("/"), 2000);
      } finally {
        setIsLoading(false);
      }
    };

    if (personId) loadMemberData();
  }, [personId, router]);

  const currentData = useMemo<TeamMemberData | null>(() => {
    if (!memberData) return null;
    return { ...memberData, schedule };
  }, [memberData, schedule]);

  const hasUnsavedChanges = useMemo(() => {
    return toCanonicalString(schedule) !== toCanonicalString(savedSchedule);
  }, [schedule, savedSchedule]);

  const validation = useMemo(() => {
    if (!currentData) return { valid: false, errors: ["Dados inválidos"] };
    return validateMemberData(currentData);
  }, [currentData]);

  const handleStartEditFrentes = () => {
    if (memberData?.frentes) {
      setEditedFrentes(memberData.frentes.split(",").map((f) => f.trim()).filter(Boolean));
      setIsEditingFrentes(true);
    }
  };

  const handleSaveFrentes = async () => {
    if (editedFrentes.length === 0) {
      notifications.show({ title: "Erro", message: "Selecione pelo menos uma frente", color: "red" });
      return;
    }
    if (!memberData) return;

    try {
      const updatedMember: TeamMemberData = { ...memberData, frentes: editedFrentes.join(", "), schedule };
      const result = await saveMember(updatedMember, false);

      if (result.success) {
        setMemberData(updatedMember);
        setIsEditingFrentes(false);
        notifications.show({ title: "Sucesso!", message: "Frentes atualizadas", color: "green", icon: <IconCheck /> });
      } else {
        notifications.show({ title: "Erro", message: result.message || "Erro ao atualizar", color: "red" });
      }
    } catch (error) {
      console.error("Erro ao salvar frentes:", error);
      notifications.show({ title: "Erro", message: "Erro ao atualizar frentes", color: "red" });
    }
  };

  const handleCancelEditFrentes = () => {
    setIsEditingFrentes(false);
    setEditedFrentes([]);
  };

  const handleStartEditHP = () => {
    setEditedHP(memberData?.hp?.toString() || "0");
    setIsEditingHP(true);
  };

  const handleSaveHP = async () => {
    const value = parseFloat(editedHP);
    if (isNaN(value) || value < 0) {
      notifications.show({ title: "Erro", message: "Valor inválido para HP", color: "red" });
      return;
    }
    if (!memberData || !isAdminMode) return;

    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-member-metadata",
          email: memberData.email,
          hp: editedHP,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetch("/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "notify-profile-change",
            userEmail: memberData.email,
            userName: memberData.name,
            field: "HP (Horas Presenciais)",
            oldValue: memberData.hp?.toString() || "0",
            newValue: editedHP,
          }),
        });

        setMemberData({ ...memberData, hp: editedHP });
        setIsEditingHP(false);
        notifications.show({ 
          title: "Sucesso!", 
          message: `HP atualizado para ${editedHP}h. Email enviado ao usuário.`, 
          color: "green", 
          icon: <IconCheck /> 
        });
      } else {
        notifications.show({ title: "Erro", message: result.message || "Erro ao atualizar", color: "red" });
      }
    } catch (error) {
      console.error("Erro ao salvar HP:", error);
      notifications.show({ title: "Erro", message: "Erro ao atualizar HP", color: "red" });
    }
  };

  const handleCancelEditHP = () => {
    setIsEditingHP(false);
    setEditedHP("");
  };

  const handleStartEditHO = () => {
    setEditedHO(memberData?.ho?.toString() || "0");
    setIsEditingHO(true);
  };

  const handleSaveHO = async () => {
    const value = parseFloat(editedHO);
    if (isNaN(value) || value < 0) {
      notifications.show({ title: "Erro", message: "Valor inválido para HO", color: "red" });
      return;
    }
    if (!memberData || !isAdminMode) return;

    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-member-metadata",
          email: memberData.email,
          ho: editedHO,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetch("/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "notify-profile-change",
            userEmail: memberData.email,
            userName: memberData.name,
            field: "HO (Horas Online)",
            oldValue: memberData.ho?.toString() || "0",
            newValue: editedHO,
          }),
        });

        setMemberData({ ...memberData, ho: editedHO });
        setIsEditingHO(false);
        notifications.show({ 
          title: "Sucesso!", 
          message: `HO atualizado para ${editedHO}h. Email enviado ao usuário.`, 
          color: "green", 
          icon: <IconCheck /> 
        });
      } else {
        notifications.show({ title: "Erro", message: result.message || "Erro ao atualizar", color: "red" });
      }
    } catch (error) {
      console.error("Erro ao salvar HO:", error);
      notifications.show({ title: "Erro", message: "Erro ao atualizar HO", color: "red" });
    }
  };

  const handleCancelEditHO = () => {
    setIsEditingHO(false);
    setEditedHO("");
  };

  const handleReset = async () => {
    try {
      const exampleData = await getExampleData();
      const resetData: TeamMemberData = {
        ...exampleData,
        email: memberData?.email || personId, 
      };
      setMemberData(resetData);
      setSchedule(resetData.schedule || {});
      notifications.show({
        title: "Resetado",
        message: "Dados resetados para exemplo",
        color: "blue",
        icon: <IconRefresh />,
      });
    } catch (error) {
      console.error("Erro ao resetar:", error);
      notifications.show({ title: "Erro", message: "Erro ao carregar dados de exemplo", color: "red" });
    }
  };

  const handleSave = async () => {
    if (!currentData || !validation.valid) return false;

    const allViolations: RuleViolation[] = [];
    
    const scheduleArray: string[] = [];
    for (let day = 0; day <= 6; day++) {
      for (let hour = 7; hour <= 19; hour++) {
        const status = schedule?.[day]?.[hour];
        let code = "";
        if (status === "presencial") code = "P";
        else if (status === "online") code = "O";
        else if (status === "reuniao") code = "R";
        else if (status === "aula") code = "A";
        else if (status === "ocupado") code = "X";
        else if (status === "almoco") code = "L";
        scheduleArray.push(code);
      }
    }
    
    if (hp > 0 && ho > 0) {
      const hoursValidation = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate-hours", scheduleRow: scheduleArray, hp, ho })
      }).then(res => res.json());
      
      if (!hoursValidation.isValid) {
        allViolations.push({ code: "weekday-lunch-11-14" as any, day: -1, message: `❌ ${hoursValidation.message}` });
      }
    }
    
    const scheduleResult = validateSchedule(schedule);
    if (!scheduleResult.ok) allViolations.push(...scheduleResult.violations);
    
    try {
      const dynamicValidation = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate-dynamic-rules", scheduleRow: scheduleArray })
      }).then(res => res.json());
      
      if (!dynamicValidation.isValid && dynamicValidation.errors) {
        dynamicValidation.errors.forEach((msg: string) => {
          allViolations.push({ code: "dynamic-rule" as any, day: -1, message: msg });
        });
      }
    } catch (error) {
      console.error("Erro ao validar regras dinâmicas:", error);
    }
    
    if (allViolations.length > 0) {
      setRulesViolations(allViolations);
      setRulesModalOpen(true);
      return false;
    }

    if (currentData.email === "exemplo@example.com") {
      notifications.show({ title: "Erro", message: "Não é possível salvar dados de exemplo.", color: "red" });
      return false;
    }

    setIsSaving(true);
    try {
      if (isAdminMode && adminEmail) {
        const { saveSuggestedSchedule } = await import("../../../services/googleSheets");
        const result = await saveSuggestedSchedule(adminEmail, currentData.email, schedule);
        
        if (result.success) {
          notifications.show({ 
            title: "Sugestão Enviada!", 
            message: `Horário sugerido para ${memberData?.name}. O membro será notificado por email.`, 
            color: "blue", 
            icon: <IconCheck />,
            autoClose: 5000
          });
          setSavedSchedule(cloneSchedule(schedule));
          return true;
        } else {
          notifications.show({ title: "Erro", message: result.message, color: "red" });
          return false;
        }
      }
      
      const result = await saveMember(currentData, isNewMember);
      if (result.success) {
        notifications.show({ title: "Sucesso!", message: "Dados salvos", color: "green", icon: <IconCheck /> });
        setMemberData(currentData); 
        setSavedSchedule(cloneSchedule(schedule)); 
        setIsNewMember(false);
        return true;
      } else {
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          const dynamicViolations: RuleViolation[] = result.errors.map((msg: string) => ({
            code: "dynamic-rule" as any,
            day: -1,
            message: msg
          }));
          setRulesViolations(dynamicViolations);
          setRulesModalOpen(true);
        } else if (result.message && result.message.includes("viola as seguintes regras")) {
          const errorLines = result.message.split("\n").filter((line: string) => line.trim() !== "");
          const dynamicViolations = errorLines.slice(1).map((msg: string) => ({
            code: "dynamic-rule" as any,
            day: -1,
            message: msg
          }));
          setRulesViolations(dynamicViolations);
          setRulesModalOpen(true);
        } else {
          notifications.show({ title: "Erro", message: result.message, color: "red" });
        }
        return false;
      }
    } catch (error) {
      notifications.show({ title: "Erro", message: "Erro ao salvar.", color: "red" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestException = async () => {
    if (!currentData) return;
    
    setIsRequestingException(true);
    setRulesModalOpen(false);
    
    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "request-schedule-exception", 
          email: currentData.email,
          schedule: currentData.schedule,
          violations: rulesViolations.map(v => v.message)
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        notifications.show({ 
          title: "Solicitação Enviada!", 
          message: "Seu horário foi enviado para aprovação do administrador. Você será notificado por email sobre a decisão.", 
          color: "blue",
          icon: <IconCheck />,
          autoClose: 7000
        });
        setSavedSchedule(cloneSchedule(schedule));
        if (memberData) {
          setMemberData({ ...memberData, pendingTimeTable: 1 });
        }
      } else {
        notifications.show({ 
          title: "Erro", 
          message: result.message || "Erro ao solicitar exceção", 
          color: "red" 
        });
      }
    } catch (error) {
      console.error("Erro ao solicitar exceção:", error);
      notifications.show({ 
        title: "Erro", 
        message: "Erro ao enviar solicitação", 
        color: "red" 
      });
    } finally {
      setIsRequestingException(false);
    }
  };

  const handleAcceptSuggestion = async () => {
    if (!memberData) return;
    
    setIsAcceptingSuggestion(true);
    try {
      const result = await acceptSuggestedSchedule(memberData.email);
      
      if (result.success) {
        notifications.show({
          title: "Sugestão Aceita!",
          message: "O horário sugerido foi aplicado com sucesso.",
          color: "green",
          icon: <IconCheck />,
          autoClose: 3000
        });
        
        if (suggestedSchedule) {
          setSchedule(suggestedSchedule);
          setSavedSchedule(cloneSchedule(suggestedSchedule));
        }
        
        setSuggestedSchedule(null);
        setActiveTab("original");
        
        setMemberData({ ...memberData, pendingSuggestion: 0 });
      } else {
        notifications.show({
          title: "Erro",
          message: result.message || "Erro ao aceitar sugestão",
          color: "red"
        });
      }
    } catch (error) {
      console.error("Erro ao aceitar sugestão:", error);
      notifications.show({
        title: "Erro",
        message: "Erro ao processar sugestão",
        color: "red"
      });
    } finally {
      setIsAcceptingSuggestion(false);
    }
  };

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
      return undefined;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const handleBackClick = () => {
    if (hasUnsavedChanges) setConfirmExitOpen(true);
    else router.push("/horaise-editor");
  };

  const hourCounts = useMemo(() => {
    const counts = { aula: 0, online: 0, presencial: 0, reuniao: 0 };
    if (schedule) {
      Object.values(schedule).forEach((daySlots: any) => {
        Object.values(daySlots).forEach((status: any) => {
          if (status === 'aula') counts.aula++;
          else if (status === 'online') counts.online++;
          else if (status === 'presencial') counts.presencial++;
          else if (status === 'reuniao') counts.reuniao++;
        });
      });
    }
    return counts;
  }, [schedule]);

  if (isLoading) {
    return (
      <Box style={{ minHeight: "100vh", background: "#F8F9FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader size="xl" color="blue" />
      </Box>
    );
  }

  const renderToolButton = (tool: string, label: string, icon: React.ReactNode, color: string, value: string | number) => {
    const isActive = activeTool === tool;
    const canEdit = isAdminMode && (tool === 'online' || tool === 'presencial');
    const canEdit = isAdminMode && (tool === 'online' || tool === 'presencial');
    
    return (
      <Group gap={4} w="100%" wrap="nowrap">
        <UnstyledButton
          onClick={() => setActiveTool(isActive ? null : tool)}
          style={{
            width: isMobile ? "auto" : "100%", 
            minWidth: isMobile ? "85px" : "auto", 
            padding: "8px",
            borderRadius: "8px",
            backgroundColor: isActive ? `var(--mantine-color-${color}-1)` : "white", 
            border: isActive ? `2px solid var(--mantine-color-${color}-6)` : "1px solid #eee",
            transition: "all 0.2s",
            flexShrink: 0,
            flex: 1,
          }}
        >
          <Group gap="xs" w="100%" wrap="nowrap" justify={isMobile ? "center" : "flex-start"}>
            <ThemeIcon variant="light" color={color} size="sm">
              {icon}
            </ThemeIcon>
            <Stack gap={0} align={isMobile ? "center" : "flex-start"}>
               <Text size="xs" c={isActive ? color : "dimmed"} style={{ fontWeight: isActive ? 700 : 400, lineHeight: 1.1 }}>
                  {label}
               </Text>
               {tool !== 'almoco' && tool !== 'ocupado' && (
                  <Text size={isMobile ? "9px" : "xs"} c="dimmed" fw={600} style={{lineHeight: 1}}>
                      {value}h 
                  </Text>
               )}
            </Stack>
          </Group>
        </UnstyledButton>
        {canEdit && !isMobile && (
          <ActionIcon 
            variant="subtle" 
            color="gray" 
            onClick={(e) => {
              e.stopPropagation();
              if (tool === 'online') handleStartEditHO();
              else if (tool === 'presencial') handleStartEditHP();
            }}
            size="xs"
          >
            <IconPencil size={14} />
          </ActionIcon>
        )}
      </Group>
      <Group gap={4} w="100%" wrap="nowrap">
        <UnstyledButton
          onClick={() => setActiveTool(isActive ? null : tool)}
          style={{
            width: isMobile ? "auto" : "100%", 
            minWidth: isMobile ? "85px" : "auto", 
            padding: "8px",
            borderRadius: "8px",
            backgroundColor: isActive ? `var(--mantine-color-${color}-1)` : "white", 
            border: isActive ? `2px solid var(--mantine-color-${color}-6)` : "1px solid #eee",
            transition: "all 0.2s",
            flexShrink: 0,
            flex: 1,
          }}
        >
          <Group gap="xs" w="100%" wrap="nowrap" justify={isMobile ? "center" : "flex-start"}>
            <ThemeIcon variant="light" color={color} size="sm">
              {icon}
            </ThemeIcon>
            <Stack gap={0} align={isMobile ? "center" : "flex-start"}>
               <Text size="xs" c={isActive ? color : "dimmed"} style={{ fontWeight: isActive ? 700 : 400, lineHeight: 1.1 }}>
                  {label}
               </Text>
               {tool !== 'almoco' && tool !== 'ocupado' && (
                  <Text size={isMobile ? "9px" : "xs"} c="dimmed" fw={600} style={{lineHeight: 1}}>
                      {value}h 
                  </Text>
               )}
            </Stack>
          </Group>
        </UnstyledButton>
        {canEdit && !isMobile && (
          <ActionIcon 
            variant="subtle" 
            color="gray" 
            onClick={(e) => {
              e.stopPropagation();
              if (tool === 'online') handleStartEditHO();
              else if (tool === 'presencial') handleStartEditHP();
            }}
            size="xs"
          >
            <IconPencil size={14} />
          </ActionIcon>
        )}
      </Group>
    );
  };

  const renderTools = () => (
    <>
        {renderToolButton("aula", "Aula", <IconSchool size={14} />, "blue", hourCounts.aula)}
        {renderToolButton("online", "Online", <IconDeviceLaptop size={14} />, "teal", `${hourCounts.online}/${ho}`)}
        {renderToolButton("presencial", "Presenc.", <IconBuildingSkyscraper size={14} />, "green", `${hourCounts.presencial}/${hp}`)}
        {renderToolButton("reuniao", "Reunião", <IconUsers size={14} />, "orange", hourCounts.reuniao)}
        {renderToolButton("almoco", "Almoço", <IconToolsKitchen2 size={14} />, "yellow", 0)}
        {renderToolButton("ocupado", "Ocupado", <IconBan size={14} />, "red", 0)}
    </>
  );

  const renderScheduleTable = (scheduleData: ScheduleData, isReadOnly: boolean) => (
    <ScrollArea type="auto" offsetScrollbars>
      <Table
        striped
        highlightOnHover
        withTableBorder
        withColumnBorders
        style={{ 
          textAlign: "center", 
          background: "white", 
          tableLayout: "fixed",
          minWidth: isMobile ? "600px" : "100%" 
        }}
        onMouseLeave={() => !isReadOnly && setIsDragging(false)} 
      >
        <Table.Thead bg="gray.1">
          <Table.Tr>
            <Table.Th style={{ width: "72px", textAlign: "center", height: ROW_HEIGHT }}>Horário</Table.Th>
            {DAY_LABELS_SHORT.map((day) => (<Table.Th key={day} style={{ textAlign: "center", height: ROW_HEIGHT }}>{day}</Table.Th>))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {HOURS_DISPLAY.map((hour) => (
            <Table.Tr key={hour}>
              <Table.Td style={{ fontWeight: 500, color: "#888", height: ROW_HEIGHT, fontSize: '12px' }}>{hour}-{hour+1}h</Table.Td>
              {WEEKDAY_UI_INDICES.map((dayIndex) => {
                const status = scheduleData?.[dayIndex]?.[hour];
                const config = status ? getStatusConfig(status) : null;

                return (
                  <Table.Td
                    key={`${dayIndex}-${hour}`}
                    p={0}
                    style={{ cursor: isReadOnly ? "default" : "pointer", height: ROW_HEIGHT }}
                    onClick={() => !isReadOnly && handleCellClick(dayIndex, hour)}
                    onMouseDown={(e) => !isReadOnly && handleMouseDown(dayIndex, hour, e)}
                    onMouseEnter={() => !isReadOnly && handleMouseEnter(dayIndex, hour)}
                  >
                    {config ? (
                      isMobile ? (
                        <Box w="100%" h="100%" bg={`${config.color}.1`} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderLeft: `4px solid var(--mantine-color-${config.color}-6)` }}>
                          <Text size="xs" c={`${config.color}.9`} fw={700}>{config.label}</Text>
                        </Box>
                      ) : (
                        <HoverCard width={200} shadow="md" position="bottom" withArrow>
                          <HoverCard.Target>
                            <Box w="100%" h="100%" pl="sm" bg={`${config.color}.1`} style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", borderLeft: `5px solid var(--mantine-color-${config.color}-6)` }}>
                              <Text size="xs" c={`${config.color}.9`} fw={500} style={{ lineHeight: 1.2 }}>{config.label}</Text>
                            </Box>
                          </HoverCard.Target>
                        </HoverCard>
                      )
                    ) : (
                      <Box w="100%" h="100%" /> 
                    )}
                  </Table.Td>
                );
              })}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );

  return (
    <>
      <TopNavBar />
      <Box style={{ minHeight: "100vh", background: "#F8F9FF", display: "flex", flexDirection: "column", paddingTop: isMobile ? "80px" : "140px", paddingBottom: "40px" }}>
        <Container size={isMobile ? "100%" : "96%"} style={{ width: "100%" }} px={isMobile ? "xs" : "md"}>
          
          <Grid gutter={isMobile ? 20 : 40}>
            <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
              <Stack gap={isMobile ? "sm" : "xl"}>
                
                <Box ta="left">
                  <Title order={1} size={isMobile ? "h3" : "h1"} style={{ marginBottom: 4 , paddingTop: isMobile ? "40px" : "0px"}}>
                    <span style={{ background: "#0E1862", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 800 }}>HORAISE</span>{" "}
                    <span style={{ color: "#8EC9FC", fontWeight: 800 }}>EDITOR</span>
                  </Title>
                  <Text size="sm" c="dimmed">Edite sua disponibilidade e horários.</Text>
                </Box>

                {isNewMember && <Alert radius="md" variant="light" color="blue" title="Novo Perfil" icon={<IconAlertCircle />}>Dados de exemplo.</Alert>}
                
                {isAdminMode && (
                  <Alert radius="md" variant="light" color="orange" title="👨‍💼 Modo Administrador" icon={<IconAlertCircle />}>
                    Você está editando o horário de outro membro. Ao salvar, será enviada uma sugestão para <strong>{memberData?.name}</strong>.
                  </Alert>
                )}
                
                {isAdminMode && (
                  <Alert radius="md" variant="light" color="orange" title="👨‍💼 Modo Administrador" icon={<IconAlertCircle />}>
                    Você está editando o horário de outro membro. Ao salvar, será enviada uma sugestão para <strong>{memberData?.name}</strong>.
                  </Alert>
                )}

                <Stack gap={isMobile ? "xs" : "md"}>
                  <Paper p="sm" radius="md" withBorder shadow="sm">
                    <Group justify="space-between" align="center">
                        <Stack gap={0}>
                          <Group gap="sm" align="center" wrap="wrap" mb={2}>
                            <Text fw={700} size="md" c="#0E1862" truncate>{memberData?.name || personId}</Text>
                            
                            {memberData?.bolsa && memberData.bolsa.split(',').map((bolsaItem: string, idx: number) => {
                              const bolsaName = bolsaItem.trim();
                              if (!bolsaName) return null;
                              
                              return (
                                <Badge 
                                  key={idx}
                                  size="xs" 
                                  variant="light"
                                  color={bolsasColors[bolsaName] || "blue"} 
                                  style={{ textTransform: "none", fontWeight: 700 }}
                                >
                                  {bolsaName}
                                </Badge>
                              );
                            })}
                          </Group>
                          <Text size="xs" c="dimmed" truncate style={{maxWidth: '200px'}}>{memberData?.email || personId}</Text>
                        </Stack>
                        <Badge variant="light" color={hasUnsavedChanges ? "orange" : "green"}>{hasUnsavedChanges ? "Não salvo" : "Salvo"}</Badge>
                    </Group>
                  </Paper>

                  {/* frentes */}
                  <Box>
                    <Group justify="space-between" mb="xs">
                        <Text size="sm" fw={600} c="#4A5568">Frentes:</Text>
                        {!isEditingFrentes && <ActionIcon variant="subtle" color="gray" onClick={handleStartEditFrentes} size="xs"><IconPencil size={14} /></ActionIcon>}
                    </Group>
                    {isEditingFrentes ? (
                        <Stack gap="sm">
                            <MultiSelect data={frentesOptions} value={editedFrentes} onChange={setEditedFrentes} searchable />
                            <Group gap="xs">
                                <Button size="xs" color="green" onClick={handleSaveFrentes}>Salvar</Button>
                                <Button size="xs" variant="default" onClick={handleCancelEditFrentes}>Cancelar</Button>
                            </Group>
                        </Stack>
                    ) : (
                        isMobile ? (
                            <ScrollArea type="never" offsetScrollbars={false}>
                                <Group gap="xs" wrap="nowrap" pb={4}>
                                    {memberData?.frentes?.split(',').map(f => f.trim()).filter(Boolean).sort().map((frente, idx) => {
                                        const emoji = frentesEmojis[frente] || "📌";
                                        return <Badge key={idx} size="sm" style={{ textTransform: "none", flexShrink: 0 }} styles={{ root: { backgroundColor: 'rgba(142, 201, 252, 0.2)', color: '#1A202C', border: 'none', fontWeight: 600 } }}>{emoji} {frente}</Badge>;
                                    })}
                                </Group>
                            </ScrollArea>
                        ) : (
                            <Group gap="xs">
                                {memberData?.frentes?.split(',').map(f => f.trim()).filter(Boolean).sort().map((frente, idx) => {
                                    const emoji = frentesEmojis[frente] || "📌";
                                    return <Badge key={idx} size="sm" style={{ textTransform: "none" }} styles={{ root: { backgroundColor: 'rgba(142, 201, 252, 0.2)', color: '#1A202C', border: 'none', fontWeight: 600 } }}>{emoji} {frente}</Badge>;
                                })}
                            </Group>
                        )
                    )}
                  </Box>

                  
                  <Box mt={isMobile ? 0 : "xs"}>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={600} style={{ textDecoration: 'underline', color: '#4A5568' }}>distribuição de horas:</Text>
                      <HoverCard width={320} shadow="md" withArrow position="left">
                        <HoverCard.Target>
                          <ActionIcon variant="subtle" color="gray" size="sm">
                            <IconAlertTriangle size={16} /> 
                          </ActionIcon>
                        </HoverCard.Target>
                        <HoverCard.Dropdown>
                          <Group gap="xs" mb="xs">
                            <ThemeIcon size="md" variant="light" color="blue"><IconAlertTriangle size={16} /></ThemeIcon>
                            <Text size="sm" fw={700} c="blue">Regras</Text>
                          </Group>
                          {dynamicRules ? (
                            <List size="xs" spacing={4}>
                              <List.Item>O horário de aulas deve refletir sua grade no SAU</List.Item>
                              <List.Item>Horário de trabalho: <strong>{dynamicRules.inicio}h - {dynamicRules.fim}h</strong></List.Item>
                              <List.Item>Almoço obrigatório: <strong>{dynamicRules.intervaloAlmoco}h</strong></List.Item>
                              <List.Item>Mínimo <strong>{dynamicRules.minimoSlotsConsecutivos} slots consecutivos</strong></List.Item>
                              <List.Item>Mínimo <strong>{dynamicRules.minimoSlotsDiariosPresencial} slots presenciais</strong> por dia</List.Item>
                              <List.Item>Você pode solicitar exceção em casos especiais</List.Item>
                            </List>
                          ) : (
                            <Text size="xs" c="dimmed">Carregando regras...</Text>
                          )}
                        </HoverCard.Dropdown>
                      </HoverCard>
                    </Group>
                    
                    {!isMobile && <Text size="xs" c="dimmed" mb="xs">Clique em uma categoria abaixo para ativar o modo de pintura.</Text>}
                    
                    {isMobile ? (
                        <ScrollArea type="never" offsetScrollbars={false} mb="sm">
                            <Group gap="xs" wrap="nowrap" pb="xs">
                                {renderTools()}
                            </Group>
                        </ScrollArea>
                    ) : (
                        <SimpleGrid cols={1} spacing="xs" verticalSpacing="xs">
                            {renderTools()}
                        </SimpleGrid>
                    )}
                  </Box>

                </Stack>
              </Stack>
            </Grid.Col>

            {/*tabela */}
            <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
              <Stack gap="md">
                {suggestedSchedule && (
                  <Alert variant="light" color="blue" title="📝 Nova Sugestão de Horário" icon={<IconInfoCircle />}>
                    O administrador sugeriu um novo horário para você. Use as abas abaixo para comparar e decidir.
                  </Alert>
                )}
                
                {suggestedSchedule ? (
                  <Tabs value={activeTab} onChange={(value) => setActiveTab(value as "original" | "suggested")}>
                    <Tabs.List>
                      <Tabs.Tab value="original">Meu Horário Atual</Tabs.Tab>
                      <Tabs.Tab value="suggested">Sugestão do Admin</Tabs.Tab>
                    </Tabs.List>
                    
                    <Tabs.Panel value="original" pt="md">
                      {renderScheduleTable(schedule, false)}
                    </Tabs.Panel>
                    
                    <Tabs.Panel value="suggested" pt="md">
                      {renderScheduleTable(suggestedSchedule, true)}
                      <Group justify="flex-end" mt="md">
                        <Button 
                          color="green" 
                          leftSection={<IconCheck size={18} />}
                          onClick={handleAcceptSuggestion}
                          loading={isAcceptingSuggestion}
                        >
                          Aceitar Sugestão
                        </Button>
                        <Button 
                          color="red" 
                          variant="light"
                          leftSection={<IconX size={18} />}
                          onClick={() => {
                            setSuggestedSchedule(null);
                            setActiveTab("original");
                          }}
                        >
                          Recusar
                        </Button>
                      </Group>
                    </Tabs.Panel>
                  </Tabs>
                ) : (
                  renderScheduleTable(schedule, false)
                )}
                
                {(!suggestedSchedule || activeTab === "original") && (
                  <Group justify={isMobile ? "space-between" : "flex-end"} mt="md">
                {/* Alerta de sugestão pendente */}
                {suggestedSchedule && (
                  <Alert variant="light" color="blue" title="📝 Nova Sugestão de Horário" icon={<IconInfoCircle />}>
                    O administrador sugeriu um novo horário para você. Use as abas abaixo para comparar e decidir.
                  </Alert>
                )}
                
                {/* Tabs para original e sugestão */}
                {suggestedSchedule ? (
                  <Tabs value={activeTab} onChange={(value) => setActiveTab(value as "original" | "suggested")}>
                    <Tabs.List>
                      <Tabs.Tab value="original">Meu Horário Atual</Tabs.Tab>
                      <Tabs.Tab value="suggested">Sugestão do Admin</Tabs.Tab>
                    </Tabs.List>
                    
                    <Tabs.Panel value="original" pt="md">
                      {renderScheduleTable(schedule, false)}
                    </Tabs.Panel>
                    
                    <Tabs.Panel value="suggested" pt="md">
                      {renderScheduleTable(suggestedSchedule, true)}
                      <Group justify="flex-end" mt="md">
                        <Button 
                          color="green" 
                          leftSection={<IconCheck size={18} />}
                          onClick={handleAcceptSuggestion}
                          loading={isAcceptingSuggestion}
                        >
                          Aceitar Sugestão
                        </Button>
                        <Button 
                          color="red" 
                          variant="light"
                          leftSection={<IconX size={18} />}
                          onClick={() => {
                            setSuggestedSchedule(null);
                            setActiveTab("original");
                          }}
                        >
                          Recusar
                        </Button>
                      </Group>
                    </Tabs.Panel>
                  </Tabs>
                ) : (
                  renderScheduleTable(schedule, false)
                )}
                
                {/* Botões de ação (apenas na aba original sem sugestão) */}
                {(!suggestedSchedule || activeTab === "original") && (
                  <Group justify={isMobile ? "space-between" : "flex-end"} mt="md">
                    <Button leftSection={<IconRefresh size={18} />} variant="subtle" color="gray" onClick={handleReset} size={isMobile ? "xs" : "sm"}>Reset</Button>
                    <Button leftSection={<IconX size={18} />} variant="light" color="red" onClick={() => setSchedule({})} size={isMobile ? "xs" : "sm"}>Limpar</Button>
                    <Button 
                      leftSection={<IconDeviceFloppy size={18} />} 
                      color={isAdminMode ? "orange" : "green"} 
                      onClick={handleSave} 
                      loading={isSaving} 
                      disabled={!hasUnsavedChanges && !isNewMember} 
                      size={isMobile ? "xs" : "sm"}
                    >
                      {isAdminMode ? "Sugerir Horário" : "Salvar"}
                    </Button>
                  </Group>
                )}
                    <Button 
                      leftSection={<IconDeviceFloppy size={18} />} 
                      color={isAdminMode ? "orange" : "green"} 
                      onClick={handleSave} 
                      loading={isSaving} 
                      disabled={!hasUnsavedChanges && !isNewMember} 
                      size={isMobile ? "xs" : "sm"}
                    >
                      {isAdminMode ? "Sugerir Horário" : "Salvar"}
                    </Button>
                  </Group>
                )}
              </Stack>
            </Grid.Col>
          </Grid>

          <Center mt="xl"><Text size="xs" c="dimmed" ta="center">© 2025 AISE Lab</Text></Center>
        </Container>


        <Modal opened={isEditingHP} onClose={handleCancelEditHP} title="Editar Horas Presenciais" centered>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Edite a quantidade de horas presenciais semanais para <strong>{memberData?.name}</strong>
            </Text>
            <TextInput
              label="HP (Horas Presenciais)"
              placeholder="Ex: 12"
              value={editedHP}
              onChange={(e) => setEditedHP(e.target.value)}
              type="number"
              min="0"
              step="0.5"
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={handleCancelEditHP}>Cancelar</Button>
              <Button color="green" onClick={handleSaveHP}>Salvar e Notificar</Button>
            </Group>
          </Stack>
        </Modal>

        <Modal opened={isEditingHO} onClose={handleCancelEditHO} title="Editar Horas Online" centered>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Edite a quantidade de horas online semanais para <strong>{memberData?.name}</strong>
            </Text>
            <TextInput
              label="HO (Horas Online)"
              placeholder="Ex: 8"
              value={editedHO}
              onChange={(e) => setEditedHO(e.target.value)}
              type="number"
              min="0"
              step="0.5"
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={handleCancelEditHO}>Cancelar</Button>
              <Button color="green" onClick={handleSaveHO}>Salvar e Notificar</Button>
            </Group>
          </Stack>
        </Modal>

        <Modal opened={confirmExitOpen} onClose={() => setConfirmExitOpen(false)} title="Alterações não salvas" centered>
          <Text size="sm" mb="md">Deseja sair sem salvar?</Text>
          <Group justify="flex-end">
            <Button color="green" onClick={async () => { setConfirmExitOpen(false); const ok = await handleSave(); if (ok) router.push("/horaise-editor"); }}>Salvar e Sair</Button>
            <Button variant="light" color="red" onClick={() => { setConfirmExitOpen(false); router.push("/horaise-editor"); }}>Sair sem salvar</Button>
          </Group>
        </Modal>

        <Modal opened={rulesModalOpen} onClose={() => setRulesModalOpen(false)} title="Ajustes Necessários" centered size={isMobile ? "sm" : "lg"}>
          <Alert icon={<IconAlertCircle />} color="orange" mb="sm">Seu horário não cumpre as seguintes regras:</Alert>
          <ScrollArea h={rulesViolations.length > 5 ? 300 : "auto"} type="auto">
            <Stack gap="xs" mb="md">{rulesViolations.map((v, idx) => <Text key={idx} size="sm">{v.message}</Text>)}</Stack>
          </ScrollArea>
          <Text size="xs" c="dimmed" mb="md">
            Você pode ajustar seu horário ou solicitar uma exceção ao administrador caso seja um caso especial.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setRulesModalOpen(false)}>Ajustar Horário</Button>
            <Button 
              color="blue" 
              onClick={handleRequestException}
              loading={isRequestingException}
              leftSection={<IconAlertCircle size={16} />}
            >
              Solicitar Exceção
            </Button>
          </Group>
        </Modal>
      </Box>
    </>
  );
}