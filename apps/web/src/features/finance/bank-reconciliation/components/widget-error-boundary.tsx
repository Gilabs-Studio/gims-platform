"use client";

import React, { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  title?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("WidgetErrorBoundary caught error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-destructive/30 bg-destructive/5 text-center transition-all duration-300">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <h4 className="text-sm font-semibold text-foreground mb-1">
            {this.props.title || "Widget Error"}
          </h4>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs">
            {this.state.error?.message || "Failed to render this section. Other components remain operational."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="cursor-pointer hover:-translate-y-0.5 active:translate-y-0 text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Widget
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
