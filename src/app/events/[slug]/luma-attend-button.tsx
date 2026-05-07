"use client";

import { useState, useEffect, useRef } from "react";
import { AuthRequiredModal, Button, Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, ModalFooter } from "@/components/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface LumaAttendButtonProps {
  eventSlug: string;
  lumaLink: string;
  isPaid: boolean;
  isRegistered: boolean;
  priceSol?: number;
}

export function LumaAttendButton({
  eventSlug,
  lumaLink,
  isPaid,
  isRegistered,
  priceSol,
}: LumaAttendButtonProps) {
  const [showAttendModal, setShowAttendModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoing, setIsGoing] = useState(isRegistered);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const storageKey = `event_clicked_${eventSlug}`;
  const sessionKey = `event_luma_redirect_${eventSlug}`;
  const wasBlurredRef = useRef(false);
  const searchParams = useSearchParams();
  const autoAttendTriggeredRef = useRef(false);

  // Проверяем, нажимал ли пользователь кнопку ранее
  const [hasClickedBefore, setHasClickedBefore] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasClickedBefore(localStorage.getItem(storageKey) === "true");
    }
  }, [storageKey]);

  // Отслеживаем потерю фокуса вкладки (переход на другую вкладку)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBlur = () => {
      const wasRedirected = sessionStorage.getItem(sessionKey) === "true";
      const hasClicked = localStorage.getItem(storageKey) === "true";
      
      // Если пользователь нажал кнопку и был перенаправлен на Luma, отмечаем что вкладка потеряла фокус
      if (wasRedirected && hasClicked) {
        wasBlurredRef.current = true;
      }
    };

    const handleFocus = () => {
      // Если вкладка вернулась в фокус и была потеря фокуса после перехода на Luma
      if (wasBlurredRef.current) {
        const wasRedirected = sessionStorage.getItem(sessionKey) === "true";
        const hasClicked = localStorage.getItem(storageKey) === "true";
        
        // Если пользователь был перенаправлен на Luma и вернулся, показываем модальное окно
        if (wasRedirected && hasClicked && !isRegistered && !isGoing) {
          setShowReturnModal(true);
          // Очищаем sessionStorage
          sessionStorage.removeItem(sessionKey);
          wasBlurredRef.current = false;
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleBlur();
      } else if (document.visibilityState === "visible") {
        handleFocus();
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [storageKey, sessionKey, isRegistered, isGoing]);

  // Автоматически открываем попап подтверждения если пришли с ?attend=true (с карточки на карте)
  useEffect(() => {
    if (autoAttendTriggeredRef.current) return;
    if (isRegistered || isGoing) return;
    if (searchParams.get("attend") !== "true") return;

    autoAttendTriggeredRef.current = true;

    const timer = setTimeout(() => {
      setShowAttendModal(true);
      // Убираем параметр из URL без перезагрузки страницы
      const url = new URL(window.location.href);
      url.searchParams.delete("attend");
      window.history.replaceState({}, "", url.toString());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchParams, isRegistered, isGoing]);

  // Проверяем, вернулся ли пользователь с Loom (старая логика для совместимости)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const wasRedirected = sessionStorage.getItem(sessionKey) === "true";
    const hasClicked = localStorage.getItem(storageKey) === "true";

    // Если пользователь был перенаправлен на Loom и вернулся, показываем модальное окно
    if (wasRedirected && hasClicked && !isRegistered && !isGoing && document.visibilityState === "visible") {
      // Небольшая задержка, чтобы убедиться, что страница полностью загружена
      const timer = setTimeout(() => {
        setShowReturnModal(true);
        // Очищаем sessionStorage
        sessionStorage.removeItem(sessionKey);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [storageKey, sessionKey, isRegistered, isGoing]);

  // Если пользователь уже зарегистрирован или ответил "да", показываем disabled кнопку "Going"
  if (isRegistered || isGoing) {
    return (
      <div className="flex justify-center sm:justify-start sm:mr-auto">
        <Button
          variant="primary"
          className="w-full max-w-[350px] sm:w-[350px]"
          size="lg"
          disabled
        >
          Going
        </Button>
      </div>
    );
  }

  const handleAttendClick = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    // Если пользователь уже нажимал кнопку, показываем поп-ап
    if (hasClickedBefore) {
      setShowAttendModal(true);
    } else {
      // Сохраняем в localStorage, что пользователь нажал кнопку
      localStorage.setItem(storageKey, "true");
      setHasClickedBefore(true);
      // Сохраняем в sessionStorage, что пользователь уходит на Loom
      sessionStorage.setItem(sessionKey, "true");
      // Открываем ссылку на Loom
      window.open(lumaLink, "_blank", "noopener,noreferrer");
    }
  };

  const handleAttendFromModal = () => {
    setShowAttendModal(false);
    // Сохраняем в localStorage, что пользователь нажал кнопку
    localStorage.setItem(storageKey, "true");
    setHasClickedBefore(true);
    // Сохраняем в sessionStorage, что пользователь уходит на Loom
    sessionStorage.setItem(sessionKey, "true");
    // Открываем ссылку на Loom
    window.open(lumaLink, "_blank", "noopener,noreferrer");
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);
    // НЕ закрываем модальное окно сразу - оставляем его открытым, чтобы показать индикатор загрузки

    try {
      const response = await fetch(`/api/events/${eventSlug}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "going" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register for event");
      }

      // Устанавливаем состояние, что пользователь идет
      setIsGoing(true);
      
      // Закрываем модальное окно только после успешной регистрации
      setShowReturnModal(false);
      
      // Отправляем кастомное событие для обновления виджета участников
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("event-member-updated", {
          detail: { eventSlug }
        }));
      }
      
      // Обновляем страницу для отображения изменений
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      // Модальное окно остается открытым при ошибке
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotGoing = () => {
    setShowReturnModal(false);
    // Кнопка остается активной и ведет на Loom
  };

  return (
    <>
      <div className="flex justify-center sm:justify-start sm:mr-auto">
        <Button
          variant="primary"
          className="w-full max-w-[350px] sm:w-[350px]"
          size="lg"
          onClick={handleAttendClick}
        >
          {isPaid ? `Buy Tickets - ${priceSol || 0} SOL` : "Attend"}
        </Button>
      </div>

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        variant="compact"
        title="Log in or Sign up to attend the event"
        redirectTo={`${pathname}?attend=true`}
      />

      {/* Модальное окно при повторном нажатии на кнопку */}
      <Modal isOpen={showAttendModal} onClose={() => setShowAttendModal(false)} size="md">
        <ModalHeader>
          <ModalTitle>Are you going to this event?</ModalTitle>
          <ModalDescription>
            You&apos;ve already visited the Luma page for this event. Are you planning to attend?
          </ModalDescription>
        </ModalHeader>
        <ModalContent>
          {error && (
            <p className="text-sm text-red-500 mb-4">{error}</p>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowAttendModal(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAttendFromModal}
            disabled={isLoading}
          >
            Open Luma Link
          </Button>
        </ModalFooter>
      </Modal>

      {/* Модальное окно при возврате с Loom */}
      <Modal 
        isOpen={showReturnModal} 
        onClose={() => !isLoading && setShowReturnModal(false)} 
        size="md"
      >
        <ModalHeader>
          <ModalTitle>Are you going to this event?</ModalTitle>
          <ModalDescription>
            Did you register for this event on Luma? Would you like to mark yourself as attending?
          </ModalDescription>
        </ModalHeader>
        <ModalContent>
          {error && (
            <p className="text-sm text-red-500 mb-4">{error}</p>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={handleNotGoing}
            disabled={isLoading}
          >
            No, thanks
          </Button>
          <Button
            variant="primary"
            onClick={handleRegister}
            disabled={isLoading}
            isLoading={isLoading}
          >
            Yes, I&apos;m attending
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

