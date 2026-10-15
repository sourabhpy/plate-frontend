"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

export type TabType =
  | "board"
  | "communications"
  | "my-tasks"
  | "memory"
  | "documents";

interface OverlayEntry {
  id: string;
  close: () => void;
}

interface BackStackContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  registerOverlay: (id: string, close: () => void) => () => void;
  goBack: () => void;
  canGoBack: boolean;
  stackDepth: number;
}

const BackStackContext = createContext<BackStackContextType | undefined>(undefined);

export function BackStackProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTabState] = useState<TabType>("board");
  const tabHistoryRef = useRef<TabType[]>(["board"]);
  const overlaysRef = useRef<OverlayEntry[]>([]);
  const isProgrammaticBackRef = useRef(false);
  const isPopstateHandlingRef = useRef(false);
  const [stackDepth, setStackDepth] = useState(0);

  // Sync stack depth for UI consumers (e.g. back button availability)
  const updateStackDepth = useCallback(() => {
    setStackDepth(overlaysRef.current.length + (tabHistoryRef.current.length - 1));
  }, []);

  // Initialize browser history entry on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Ensure initial history state is stamped with plate backstack info
    const currentState = window.history.state;
    if (!currentState || currentState.plateApp !== true) {
      window.history.replaceState(
        { plateApp: true, plateType: "tab", tab: "board", index: 0 },
        ""
      );
    }

    const handlePopState = (e: PopStateEvent) => {
      // If this popstate was triggered by our own manual history.back() cleanup, skip handling
      if (isProgrammaticBackRef.current) {
        isProgrammaticBackRef.current = false;
        updateStackDepth();
        return;
      }

      isPopstateHandlingRef.current = true;

      try {
        // 1. If any overlay (modal, drawer, sheet, menu) is open, close the topmost one
        if (overlaysRef.current.length > 0) {
          const topOverlay = overlaysRef.current.pop();
          if (topOverlay) {
            topOverlay.close();
          }
          updateStackDepth();
          return;
        }

        // 2. If no overlay is open, navigate to previous screen in tab stack
        if (tabHistoryRef.current.length > 1) {
          // Pop current tab
          tabHistoryRef.current.pop();
          const previousTab = tabHistoryRef.current[tabHistoryRef.current.length - 1];
          setActiveTabState(previousTab);
          updateStackDepth();
          return;
        }

        // 3. Fallback: if browser state has a tab specified
        if (e.state && e.state.plateApp && e.state.plateType === "tab" && e.state.tab) {
          setActiveTabState(e.state.tab);
          tabHistoryRef.current = [e.state.tab];
          updateStackDepth();
        }
      } finally {
        isPopstateHandlingRef.current = false;
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [updateStackDepth]);

  // Tab switching handler that manages tab back-stack history
  const setActiveTab = useCallback((newTab: TabType) => {
    setActiveTabState((prevTab) => {
      if (prevTab === newTab) return prevTab;

      // Don't push duplicates in sequence
      const history = tabHistoryRef.current;
      if (history[history.length - 1] !== newTab) {
        history.push(newTab);
        if (typeof window !== "undefined") {
          window.history.pushState(
            {
              plateApp: true,
              plateType: "tab",
              tab: newTab,
              depth: history.length,
            },
            ""
          );
        }
      }

      updateStackDepth();
      return newTab;
    });
  }, [updateStackDepth]);

  // Register an overlay (modal, drawer, menu, bottom sheet)
  const registerOverlay = useCallback(
    (id: string, close: () => void) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      const entry: OverlayEntry = { id, close };
      overlaysRef.current.push(entry);

      // Push history state for this overlay so browser/gesture back catches it
      window.history.pushState(
        {
          plateApp: true,
          plateType: "overlay",
          overlayId: id,
          depth: overlaysRef.current.length,
        },
        ""
      );
      updateStackDepth();

      // Return cleanup function when overlay closes
      return () => {
        const index = overlaysRef.current.findIndex((o) => o === entry);
        if (index !== -1) {
          overlaysRef.current.splice(index, 1);
          updateStackDepth();

          // If the overlay was closed via UI (not via browser back popstate),
          // roll back the browser history by 1 to keep history stack in sync
          if (!isPopstateHandlingRef.current) {
            isProgrammaticBackRef.current = true;
            window.history.back();
          }
        }
      };
    },
    [updateStackDepth]
  );

  // Programmatic back trigger (can be invoked by UI back buttons or keyboard shortcuts)
  const goBack = useCallback(() => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  }, []);

  const canGoBack = stackDepth > 0;

  return (
    <BackStackContext.Provider
      value={{
        activeTab,
        setActiveTab,
        registerOverlay,
        goBack,
        canGoBack,
        stackDepth,
      }}
    >
      {children}
    </BackStackContext.Provider>
  );
}

export function useBackStack() {
  const context = useContext(BackStackContext);
  if (!context) {
    // Return safe dummy implementations if used outside provider
    return {
      activeTab: "board" as TabType,
      setActiveTab: () => {},
      registerOverlay: () => () => {},
      goBack: () => {
        if (typeof window !== "undefined") window.history.back();
      },
      canGoBack: false,
      stackDepth: 0,
    };
  }
  return context;
}

/**
 * Convenience hook for modals, drawers, and overlay menus to automatically hook into back stack
 */
export function useBackStackOverlay(
  isOpen: boolean,
  onClose: () => void,
  id: string = "overlay"
) {
  const { registerOverlay } = useBackStack();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const unregister = registerOverlay(id, () => {
      onCloseRef.current();
    });

    return () => {
      unregister();
    };
  }, [isOpen, id, registerOverlay]);
}
