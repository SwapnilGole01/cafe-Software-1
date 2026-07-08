import React, { createContext, useContext, useState, useEffect } from "react";

interface TableSessionContextType {
  tableId: number | null;
  setTableId: (id: number | null) => void;
  tableToken: string | null;
  setTableToken: (token: string | null) => void;
  sessionToken: string | null;
  setSessionToken: (token: string | null) => void;
}

const TableSessionContext = createContext<TableSessionContextType | undefined>(undefined);

export function TableSessionProvider({ children }: { children: React.ReactNode }) {
  const [tableId, setTableIdState] = useState<number | null>(() => {
    // 1. Try to parse from path first: /table/123 or /table/[id]
    const match = window.location.pathname.match(/^\/table\/(\d+)/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed)) {
        localStorage.setItem("cafe_table_id", parsed.toString());
        return parsed;
      }
    }

    // 2. Fallback to search query param: ?table=123
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get("table");
    if (tableParam) {
      const parsed = parseInt(tableParam, 10);
      if (!isNaN(parsed)) {
        localStorage.setItem("cafe_table_id", parsed.toString());
        return parsed;
      }
    }

    // 3. Fallback to localStorage
    const stored = localStorage.getItem("cafe_table_id");
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  });

  const [tableToken, setTableTokenState] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      localStorage.setItem("cafe_table_token", tokenParam);
      return tokenParam;
    }

    return localStorage.getItem("cafe_table_token");
  });

  const [sessionToken, setSessionTokenState] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const isScan = params.get("scan") === "true";
    if (isScan) {
      localStorage.removeItem("cafe_session_token");
      return null;
    }
    return localStorage.getItem("cafe_session_token");
  });

  const setTableId = (id: number | null) => {
    setTableIdState(id);
    if (id !== null) {
      localStorage.setItem("cafe_table_id", id.toString());
    } else {
      localStorage.removeItem("cafe_table_id");
    }
  };

  const setTableToken = (token: string | null) => {
    setTableTokenState(token);
    if (token !== null) {
      localStorage.setItem("cafe_table_token", token);
    } else {
      localStorage.removeItem("cafe_table_token");
    }
  };

  const setSessionToken = (token: string | null) => {
    setSessionTokenState(token);
    if (token !== null) {
      localStorage.setItem("cafe_session_token", token);
    } else {
      localStorage.removeItem("cafe_session_token");
    }
  };

  // Sync URL if needed or handle changes
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get("table");
      const tokenParam = params.get("token");

      if (tableParam) {
        const parsed = parseInt(tableParam, 10);
        if (!isNaN(parsed) && parsed !== tableId) {
          setTableIdState(parsed);
          localStorage.setItem("cafe_table_id", parsed.toString());
          
          if (tokenParam) {
            setTableTokenState(tokenParam);
            localStorage.setItem("cafe_table_token", tokenParam);
          } else {
            setTableTokenState(null);
            localStorage.removeItem("cafe_table_token");
          }
        }
      }
    };

    const handlePopState = () => {
      const match = window.location.pathname.match(/^\/table\/(\d+)/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed !== tableId) {
          setTableIdState(parsed);
          localStorage.setItem("cafe_table_id", parsed.toString());
        }
      }
      syncFromUrl();
    };

    window.addEventListener("popstate", handlePopState);
    syncFromUrl();

    return () => window.removeEventListener("popstate", handlePopState);
  }, [tableId]);

  return (
    <TableSessionContext.Provider value={{ tableId, setTableId, tableToken, setTableToken, sessionToken, setSessionToken }}>
      {children}
    </TableSessionContext.Provider>
  );
}

export function useTableSession() {
  const context = useContext(TableSessionContext);
  if (context === undefined) {
    throw new Error("useTableSession must be used within a TableSessionProvider");
  }
  return context;
}
