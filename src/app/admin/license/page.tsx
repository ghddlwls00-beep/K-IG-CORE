"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPlanLabel, type LicensePlan } from "@/lib/license";
import { getOrCreateDeviceId } from "@/lib/device";

const GENERATED_HISTORY_KEY = "kig:admin:history";

interface HistoryItem {
  key: string;
  plan: LicensePlan;
  createdAt: string;
  memo?: string;
  maxDevices?: number;
}

interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  registeredAt: number;
  lastSeenAt: number;
}

interface DeviceRecordMap {
  [key: string]: {
    key: string;
    plan: string;
    maxDevices?: number;
    devices: DeviceInfo[];
    isRevoked?: boolean;
    revokedAt?: number;
    revokeReason?: string;
  };
}

export default function AdminLicensePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(null);

  const [planCategory, setPlanCategory] = useState<"VIP" | "STUDENT">("VIP");
  const [selectedPlan, setSelectedPlan] = useState<LicensePlan>("1Y");
  const [quantity, setQuantity] = useState<number>(1);
  const [maxDevicesPerKey, setMaxDevicesPerKey] = useState<number>(2);
  const [memo, setMemo] = useState("");
  const [newlyGenerated, setNewlyGenerated] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Device registration records loaded from server
  const [deviceRecords, setDeviceRecords] = useState<DeviceRecordMap>({});
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);

  // Check server-side admin session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/admin/check");
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
        }
      } catch {
        // ignore
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkSession();

    try {
      const raw = window.localStorage.getItem(GENERATED_HISTORY_KEY);
      if (raw) {
        setHistory(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch registered devices when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchDeviceStatus();
    }
  }, [isAuthenticated]);

  async function fetchDeviceStatus() {
    setIsRefreshingDevices(true);
    try {
      const res = await fetch("/api/license/status", {
        method: "GET",
      });
      const data = await res.json();
      if (data.success && data.records) {
        setDeviceRecords(data.records);
      } else if (res.status === 401) {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error("Failed to fetch device status:", err);
    } finally {
      setIsRefreshingDevices(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!pinInput.trim() || isLoggingIn) return;
    setIsLoggingIn(true);
    setPinError(false);
    setLoginErrorMessage(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setPinInput("");
      } else {
        setPinError(true);
        setLoginErrorMessage(data.error || "관리자 인증에 실패했습니다.");
      }
    } catch {
      setPinError(true);
      setLoginErrorMessage("서버 통신 오류가 발생했습니다.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setDeviceRecords({});
  }

  async function handleGenerate() {
    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          quantity,
          maxDevices: maxDevicesPerKey,
          memo: memo.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.keys && data.items) {
        setNewlyGenerated(data.keys);
        const updatedHistory = [...data.items, ...history].slice(0, 100);
        setHistory(updatedHistory);
        setMemo("");

        try {
          window.localStorage.setItem(GENERATED_HISTORY_KEY, JSON.stringify(updatedHistory));
        } catch {}

        setTimeout(() => {
          fetchDeviceStatus();
        }, 300);
      } else {
        alert(data.error || "이용권 발급에 실패했습니다.");
      }
    } catch {
      alert("서버 통신 오류가 발생했습니다.");
    }
  }

  async function handleUpdateMaxDevices(key: string, newLimit: number) {
    try {
      const res = await fetch("/api/license/update-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, maxDevices: newLimit }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = history.map((item) =>
          item.key === key ? { ...item, maxDevices: newLimit } : item
        );
        setHistory(updated);
        try {
          window.localStorage.setItem(GENERATED_HISTORY_KEY, JSON.stringify(updated));
        } catch {}
        fetchDeviceStatus();
      } else {
        alert(data.error || "기기 한도 변경에 실패했습니다.");
      }
    } catch {
      alert("서버 통신 오류가 발생했습니다.");
    }
  }

  async function handleTestRegister(key: string) {
    try {
      const dev = getOrCreateDeviceId();
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          deviceId: dev.id,
          deviceName: dev.name || "관리자 테스트 기기",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`[테스트 등록 성공!]\n현재 브라우저(${dev.name})가 해당 이용권에 등록되었습니다.\n'0대'에서 '1대'로 즉시 변경됩니다.`);
        fetchDeviceStatus();
      } else {
        alert(data.error || "등록 실패");
      }
    } catch {
      alert("서버 통신 오류가 발생했습니다.");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }

  function copyAllGenerated() {
    if (newlyGenerated.length === 0) return;
    navigator.clipboard.writeText(newlyGenerated.join("\n")).then(() => {
      setCopiedKey("ALL");
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }

  function clearHistory() {
    if (confirm("발급 기록을 초기화하시겠습니까? (기존에 발급된 코드는 사이트에서 계속 유효합니다)")) {
      setHistory([]);
      try {
        window.localStorage.removeItem(GENERATED_HISTORY_KEY);
      } catch {}
    }
  }

  async function handleResetDevice(key: string) {
    if (!confirm(`이용권 [${key}]에 등록된 기기 목록을 초기화하시겠습니까?\n초기화 시 고객이 새 기기에서 다시 등록할 수 있게 됩니다.`)) {
      return;
    }

    try {
      const res = await fetch("/api/license/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.success) {
        alert("기기 등록이 성공적으로 초기화되었습니다.");
        fetchDeviceStatus();
      } else {
        alert(data.error || "초기화에 실패했습니다.");
      }
    } catch {
      alert("서버 통신 오류가 발생했습니다.");
    }
  }

  async function handleRevokeLicense(key: string) {
    const reason = prompt(`이용권 [${key}]을 환불 차단하시겠습니까?\n차단 사유를 입력하세요 (예: 스마트스토어 환불):`, "환불 처리");
    if (!reason) return;

    try {
      const res = await fetch("/api/license/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, reason }),
      });
      const data = await res.json();
      if (data.success) {
        alert("이용권이 즉시 차단되었습니다. 모든 등록 기기의 수강이 중단됩니다.");
        fetchDeviceStatus();
      } else {
        alert(data.error || "차단 실패");
      }
    } catch {
      alert("서버 통신 오류가 발생했습니다.");
    }
  }

  async function handleUnrevokeLicense(key: string) {
    if (!confirm(`이용권 [${key}]의 차단을 해제하고 정상 상태로 복구하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch("/api/license/unrevoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.success) {
        alert("이용권 차단이 성공적으로 해제되었습니다.");
        fetchDeviceStatus();
      } else {
        alert(data.error || "해제 실패");
      }
    } catch {
      alert("서버 통신 오류가 발생했습니다.");
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
      {/* Top Breadcrumb */}
      <nav className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-[12px] text-ink-soft hover:text-ink font-medium"
        >
          ← 홈으로 돌아가기
        </Link>
      </nav>

      {/* ADMIN LOGIN PIN GATE */}
      {isCheckingAuth ? (
        <div className="mx-auto max-w-md rounded-3xl border border-black/10 bg-white p-12 text-center text-ink-soft text-[14px]">
          관리자 인증 확인 중...
        </div>
      ) : !isAuthenticated ? (
        <div className="mx-auto max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-xl flex flex-col gap-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-[26px] self-center">
            🔐
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-[20px] font-bold text-ink">관리자 보안 인증</h1>
            <p className="text-[13px] text-ink-soft">
              이용권 발급 및 기기 관리를 위해 관리자 보안 암호를 입력해 주세요.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="관리자 암호(PIN) 입력"
              className="w-full rounded-xl border border-black/15 px-4 py-3 text-center font-mono text-[16px] text-ink focus:border-ink focus:outline-none"
              autoFocus
              disabled={isLoggingIn}
            />

            {loginErrorMessage && (
              <span className="text-[12px] text-red-600 font-semibold animate-in fade-in leading-relaxed">
                {loginErrorMessage}
              </span>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-white hover:bg-black/80 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isLoggingIn ? "인증 확인 중..." : "관리자 모드 접속"}
            </button>
          </form>
        </div>
      ) : (
        /* AUTHENTICATED KEY GENERATOR */
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.08] pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white text-[22px]">
                🔑
              </div>
              <div>
                <h1 className="text-[22px] font-bold text-ink tracking-tight">
                  이용권 코드 발급 및 관리
                </h1>
                <p className="text-[13px] text-ink-soft">
                  스마트스토어, 크몽 판매용 시리얼 코드를 생성하고 기기 등록을 제어합니다. (기기 최대 2대 제한)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchDeviceStatus}
                disabled={isRefreshingDevices}
                className="rounded-xl border border-black/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {isRefreshingDevices ? "새로고침 중..." : "🔄 기기 현황 새로고침"}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-red-200 bg-red-50/70 px-3 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
              >
                🚪 로그아웃
              </button>
            </div>
          </div>

          {/* Generator Form */}
          <div className="rounded-3xl border border-black/10 bg-white p-6 sm:p-8 shadow-xs flex flex-col gap-6">
            <h2 className="text-[17px] font-bold text-ink">
              신규 이용권 코드 발급
            </h2>

            {/* Plan Category Switcher */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-ink">이용권 수강 범위 선택</label>
              <div className="flex items-center gap-2 p-1 bg-black/[0.04] rounded-2xl max-w-lg border border-black/5">
                <button
                  type="button"
                  onClick={() => {
                    setPlanCategory("VIP");
                    setSelectedPlan("1Y");
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-[13px] font-bold transition-all cursor-pointer text-center ${
                    planCategory === "VIP"
                      ? "bg-white text-ink shadow-2xs border border-black/10"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  👑 VIP 올패스 (전체 1,677강)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlanCategory("STUDENT");
                    setSelectedPlan("STU1Y");
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-[13px] font-bold transition-all cursor-pointer text-center ${
                    planCategory === "STUDENT"
                      ? "bg-white text-blue-600 shadow-2xs border border-blue-200"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  🎓 STUDENT 전용 (81강 전용)
                </button>
              </div>
            </div>

            {/* Plan Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-ink">
                {planCategory === "VIP" ? "VIP 올패스 수강 기간" : "STUDENT 전용 패스 수강 기간"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {planCategory === "VIP" ? (
                  (["1M", "1Y", "LIFE"] as LicensePlan[]).map((plan) => {
                    const active = selectedPlan === plan;
                    return (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                          active
                            ? "border-black bg-ink text-white shadow-sm"
                            : "border-black/10 bg-white text-ink hover:border-black/30"
                        }`}
                      >
                        <div className="font-bold text-[15px]">{getPlanLabel(plan)}</div>
                        <div className={`text-[12px] mt-1 ${active ? "text-gray-300" : "text-ink-soft"}`}>
                          {plan === "1M" && "30일간 1,677강 열람"}
                          {plan === "1Y" && "365일간 1,677강 열람 (추천)"}
                          {plan === "LIFE" && "무제한 평생 열람 (대표님/VIP용)"}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  (["STU1M", "STU1Y", "STULIFE"] as LicensePlan[]).map((plan) => {
                    const active = selectedPlan === plan;
                    return (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                          active
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : "border-black/10 bg-white text-ink hover:border-blue-300"
                        }`}
                      >
                        <div className="font-bold text-[15px]">{getPlanLabel(plan)}</div>
                        <div className={`text-[12px] mt-1 ${active ? "text-blue-100" : "text-ink-soft"}`}>
                          {plan === "STU1M" && "30일간 STUDENT 81강 열람"}
                          {plan === "STU1Y" && "365일간 STUDENT 81강 열람 (추천)"}
                          {plan === "STULIFE" && "무제한 평생 열람 (STUDENT 전용)"}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quantity, Device Limit, and Memo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-ink">발급 코드 개수 (티켓 수량)</label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-ink focus:outline-none cursor-pointer"
                >
                  <option value={1}>1개 (고객 주문 1건당 1장)</option>
                  <option value={5}>5개 (소량 묶음)</option>
                  <option value={10}>10개 (이벤트/프로모션)</option>
                  <option value={30}>30개 (단체 수강권)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                  <span>기기 등록 허용 한도</span>
                  <span className="text-[10.5px] font-semibold text-emerald-700 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    설정 가능
                  </span>
                </label>
                <select
                  value={maxDevicesPerKey}
                  onChange={(e) => setMaxDevicesPerKey(Number(e.target.value))}
                  className="rounded-xl border border-emerald-600/30 bg-emerald-50/40 px-3.5 py-2.5 text-[14px] font-semibold text-ink focus:border-ink focus:outline-none cursor-pointer"
                >
                  <option value={1}>1대 제한 (1인 1기기 전용)</option>
                  <option value={2}>2대 제한 (기본 추천: 스마트폰 + PC)</option>
                  <option value={3}>3대 제한 (태블릿 멀티 패스)</option>
                  <option value={4}>4대 제한 (가족 패스)</option>
                  <option value={5}>5대 제한 (VIP 단체 패스)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-ink">메모 (선택)</label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="예: 스마트스토어 홍길동님 주문"
                  className="rounded-xl border border-black/15 px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
                />
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-2xl bg-ink py-3.5 text-[15px] font-bold text-white hover:bg-black/85 transition-all cursor-pointer shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>⚡ {getPlanLabel(selectedPlan)} 코드 즉시 발급하기 (기기 {maxDevicesPerKey}대 한도)</span>
            </button>
          </div>

          {/* Newly Generated Keys Banner */}
          {newlyGenerated.length > 0 && (
            <div className="rounded-3xl border-2 border-emerald-500/40 bg-emerald-500/[0.04] p-6 sm:p-7 shadow-xs flex flex-col gap-4 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-[13px]">
                    ✓
                  </span>
                  <h3 className="text-[17px] font-bold text-emerald-950 dark:text-emerald-300">
                    방금 생성된 이용권 코드 ({newlyGenerated.length}개)
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={copyAllGenerated}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
                >
                  {copiedKey === "ALL" ? "✓ 전체 복사 완료!" : "📋 전체 코드 한번에 복사"}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {newlyGenerated.map((key, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-white p-3.5 shadow-2xs"
                  >
                    <span className="font-mono text-[16px] font-bold text-ink tracking-wider select-all">
                      {key}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(key)}
                      className="rounded-lg border border-black/10 bg-gray-50 px-3 py-1.5 font-mono text-[12px] font-semibold text-ink hover:bg-ink hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedKey === key ? "✓ 복사됨" : "코드 복사"}
                    </button>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-emerald-500/10 p-3 text-[12.5px] text-emerald-900 dark:text-emerald-200 leading-relaxed">
                💡 <strong>고객 발송 안내 팁:</strong> 복사한 코드를 고객에게 문자나 메시지로 전달하실 때 아래와 같이 보내주시면 됩니다:
                <div className="mt-1 font-mono text-[12px] bg-white/70 p-2.5 rounded border border-emerald-500/20 select-all leading-relaxed">
                  안녕하세요! K-IG 올패스 이용권 번호는 [{newlyGenerated[0]}] 입니다.<br />
                  웹사이트 상단 [이용권 등록]에 코드를 입력하시면 1,677개 모든 레슨이 즉시 열립니다.<br />
                  (※ 본 이용권은 PC, 스마트폰 등 최대 {maxDevicesPerKey}대 기기까지 등록 가능합니다)
                </div>
              </div>
            </div>
          )}

          {/* History Section with Live Device Status */}
          <div className="rounded-3xl border border-black/10 bg-white p-6 sm:p-8 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <div>
                <h3 className="text-[17px] font-bold text-ink">
                  최근 발급 내역 및 기기 등록 현황
                </h3>
                <span className="text-[12px] text-ink-faint">
                  발급된 이용권별 실시간 기기 등록 현황을 확인하고, 허용 기기 대수(한도)를 즉시 변경하거나 초기화할 수 있습니다.
                </span>
              </div>

              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-[12px] text-ink-faint hover:text-red-600 cursor-pointer"
                >
                  목록 지우기
                </button>
              )}
            </div>

            {/* Informative Guidance Banner */}
            <div className="rounded-2xl border border-blue-500/20 bg-blue-50/50 p-4 text-[12.5px] text-blue-950 flex flex-col gap-2 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-blue-900 text-[13px]">
                <span>💡</span> 기기 등록 현황 수치 (0/2대) 작동 원리 및 한도 변경 안내
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-blue-900/90 text-[12px]">
                <div className="bg-white/80 rounded-xl p-3 border border-blue-200/50">
                  <strong className="text-blue-950 block mb-0.5">① 앞의 숫자 (0대 / 실제 등록 수)</strong>
                  현재까지 고객이 홈페이지 상단 [이용권 등록]에 코드를 입력하여 <strong>실제 등록·접속한 기기 수</strong>입니다. 발급 직후에는 아직 등록되지 않아 <strong>0대</strong>로 시작하며, 고객이 등록하면 자동으로 <strong>1대</strong>로 올라갑니다.
                </div>
                <div className="bg-white/80 rounded-xl p-3 border border-blue-200/50">
                  <strong className="text-blue-950 block mb-0.5">② 뒤의 숫자 (2대 / 허용 한도 대수)</strong>
                  해당 이용권 1장으로 등록을 허용하는 <strong>최대 기기 대수</strong>입니다. 기본 2대이며, 상단 발급 시 또는 하단 각 이용권의 <strong>[기기 한도] 드롭다운</strong>을 통해 1대~5대로 언제든 즉시 변경하실 수 있습니다.
                </div>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-ink-faint">
                아직 발급된 내역이 없습니다. 상단에서 코드를 발급해 보세요.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-black/[0.06] max-h-[550px] overflow-y-auto">
                {history.map((item, idx) => {
                  const record = deviceRecords[item.key];
                  const devices = record?.devices || [];
                  const deviceCount = devices.length;
                  const itemLimit = record?.maxDevices || item.maxDevices || 2;

                  return (
                    <div key={idx} className="flex flex-col py-3.5 gap-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[14px] font-bold text-ink select-all">
                              {item.key}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold border ${
                                item.plan.startsWith("STU")
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-amber-50 text-amber-800 border-amber-300/80"
                              }`}
                            >
                              {item.plan.startsWith("STU") ? "🎓 " : "👑 "}
                              {getPlanLabel(item.plan)}
                            </span>

                            {/* Device Usage Badge with Dynamic Limit */}
                            {record?.isRevoked ? (
                              <span className="rounded-full bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 text-[10.5px] font-bold font-mono">
                                🚫 환불/차단됨{record.revokeReason ? ` (${record.revokeReason})` : ""}
                              </span>
                            ) : deviceCount === 0 ? (
                              <span className="rounded-full bg-gray-100 text-gray-700 border border-gray-200/60 px-2 py-0.5 text-[10.5px] font-semibold font-mono">
                                미등록 (0/{itemLimit}대)
                              </span>
                            ) : deviceCount < itemLimit ? (
                              <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10.5px] font-semibold font-mono">
                                {deviceCount}/{itemLimit}대 사용 중
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10.5px] font-bold font-mono">
                                {deviceCount}/{itemLimit}대 만석 (한도 도달)
                              </span>
                            )}
                          </div>

                          <span className="text-[11.5px] text-ink-faint">
                            {item.createdAt} {item.memo ? `· ${item.memo}` : ""}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Live Max Devices Limit Selector */}
                          <div className="flex items-center gap-1.5 text-[11.5px] text-ink-soft bg-gray-50 px-2.5 py-1 rounded-xl border border-black/10">
                            <span className="text-ink-faint font-medium">기기 한도:</span>
                            <select
                              value={itemLimit}
                              onChange={(e) => handleUpdateMaxDevices(item.key, Number(e.target.value))}
                              className="bg-transparent font-bold text-ink focus:outline-none cursor-pointer"
                              title="이 이용권의 등록 가능한 최대 기기 대수를 변경합니다"
                              disabled={record?.isRevoked}
                            >
                              <option value={1}>1대 제한</option>
                              <option value={2}>2대 제한 (기본)</option>
                              <option value={3}>3대 제한</option>
                              <option value={4}>4대 제한</option>
                              <option value={5}>5대 제한</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.key)}
                            className="rounded-lg border border-black/10 px-2.5 py-1 text-[11.5px] font-semibold text-ink-soft hover:bg-black/5 hover:text-ink cursor-pointer transition-colors"
                          >
                            {copiedKey === item.key ? "✓ 복사됨" : "코드 복사"}
                          </button>

                          {/* Test Register Button */}
                          {!record?.isRevoked && deviceCount === 0 && (
                            <button
                              type="button"
                              onClick={() => handleTestRegister(item.key)}
                              className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                              title="현재 브라우저를 이 이용권에 테스트 등록하여 수치가 1대로 올라가는 것을 확인합니다"
                            >
                              🧪 내 기기에 등록 테스트
                            </button>
                          )}

                          {!record?.isRevoked && deviceCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleResetDevice(item.key)}
                              className="rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-[11.5px] font-semibold text-red-600 hover:bg-red-500/15 cursor-pointer transition-colors"
                              title="고객이 기기를 분실/교체했을 때 기기 등록을 0대로 리셋합니다"
                            >
                              기기 초기화
                            </button>
                          )}

                          {/* Revoke / Unrevoke Refund Blocking Buttons */}
                          {record?.isRevoked ? (
                            <button
                              type="button"
                              onClick={() => handleUnrevokeLicense(item.key)}
                              className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-500/20 cursor-pointer transition-colors"
                              title="차단된 이용권을 정상 상태로 복구합니다"
                            >
                              ↺ 차단 해제
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRevokeLicense(item.key)}
                              className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-500/20 cursor-pointer transition-colors"
                              title="환불 고객 이용권을 즉시 차단하고 등록 기기를 모두 해제합니다"
                            >
                              🚫 환불 차단
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Detail list of registered devices */}
                      {record?.isRevoked ? (
                        <div className="ml-1 pl-3 border-l-2 border-red-500/40 flex flex-col gap-1 text-[11.5px] text-red-600">
                          <span>
                            🚫 <strong>환불 차단된 이용권입니다.</strong> (차단 시점: {record.revokedAt ? new Date(record.revokedAt).toLocaleString("ko-KR") : "기록 없음"}{record.revokeReason ? ` · 사유: ${record.revokeReason}` : ""})
                          </span>
                        </div>
                      ) : devices.length > 0 ? (
                        <div className="ml-1 pl-3 border-l-2 border-emerald-500/40 flex flex-col gap-1 text-[11.5px] text-ink-soft">
                          {devices.map((d, dIdx) => (
                            <div key={d.deviceId} className="flex items-center gap-2">
                              <span>📱 등록 기기 {dIdx + 1}: <strong>{d.deviceName}</strong></span>
                              <span className="text-ink-faint">
                                (등록일: {new Date(d.registeredAt).toLocaleDateString("ko-KR")})
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-ink-faint flex items-center gap-1 pl-1">
                          <span>💡 고객이 홈페이지 상단 [이용권 등록]에 이 코드를 입력하면 실시간으로 1/{itemLimit}대로 변경됩니다.</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
