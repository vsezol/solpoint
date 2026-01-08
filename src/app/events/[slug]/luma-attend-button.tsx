"use client";

import { useState, useEffect } from "react";
import { Button, Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, ModalFooter } from "@/components/ui";
import { useRouter } from "next/navigation";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoing, setIsGoing] = useState(isRegistered);
  const router = useRouter();

  const storageKey = `event_clicked_${eventSlug}`;
  const sessionKey = `event_luma_redirect_${eventSlug}`;

  // Проверяем, нажимал ли пользователь кнопку ранее
  const [hasClickedBefore, setHasClickedBefore] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasClickedBefore(localStorage.getItem(storageKey) === "true");
    }
  }, [storageKey]);

  // Проверяем, вернулся ли пользователь с Loom
  useEffect(() => {
    if (typeof window === "undefined") return;

    const wasRedirected = sessionStorage.getItem(sessionKey) === "true";
    const hasClicked = localStorage.getItem(storageKey) === "true";

    // Если пользователь был перенаправлен на Loom и вернулся, показываем модальное окно
    if (wasRedirected && hasClicked && !isRegistered) {
      setShowReturnModal(true);
      // Очищаем sessionStorage
      sessionStorage.removeItem(sessionKey);
    }
  }, [storageKey, sessionKey, isRegistered]);

  // Если пользователь уже зарегистрирован или ответил "да", показываем disabled кнопку "Going"
  if (isRegistered || isGoing) {
    return (
      <Button
        variant="primary"
        className="w-full"
        size="lg"
        disabled
      >
        Going
      </Button>
    );
  }

  const handleAttendClick = () => {
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
    setShowReturnModal(false);

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
      
      // Обновляем страницу для отображения изменений
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setShowReturnModal(true); // Показываем модальное окно снова, если была ошибка
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
      <Button
        variant="primary"
        className="w-full"
        size="lg"
        onClick={handleAttendClick}
      >
        {isPaid ? `Buy Tickets - ${priceSol || 0} SOL` : "Attend"}
      </Button>

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
      <Modal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} size="md">
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

