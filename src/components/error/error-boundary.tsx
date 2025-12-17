"use client";

import React, { Component, ReactNode } from "react";
import { ErrorFallback } from "./error-fallback";

/**
 * ErrorBoundary компонент для обработки ошибок в React компонентах.
 * 
 * @example
 * // Базовое использование
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * @example
 * // С кастомным fallback
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <div>
 *       <p>Custom error: {error.message}</p>
 *       <button onClick={reset}>Retry</button>
 *     </div>
 *   )}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * @example
 * // С обработчиком ошибок для логирования
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     console.error("Component error:", error);
 *     // Отправить в Sentry или другой сервис мониторинга
 *   }}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 */
interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Логируем ошибку для мониторинга
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Вызываем callback, если он передан
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Здесь можно отправить ошибку в сервис мониторинга (Sentry, LogRocket и т.д.)
    // Пример:
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, { contexts: { react: errorInfo } });
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <ErrorFallback error={this.state.error} reset={this.handleReset} />
      );
    }

    return this.props.children;
  }
}


