"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { generateLicenseKey, getPlanLabel, type LicensePlan } from "@/lib/license";

const ADMIN_PIN_KEY = "kig:admin:pin";
const DEFAULT_PIN = "kig2026!";
const GENERATED_HISTORY_KEY = "kig:admin:history";

interface HistoryItem {
  key: string;
  plan: LicensePlan;
  createdAt: string;
  memo?: string;
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
    devices: DeviceInfo[];
  };
}

export default function AdminLicensePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<LicensePlan>("1Y");
  const [quantity, setQuantity] = useState<number>(1);
  const [memo, setMemo] = useState("");
  const [newlyGenerated, setNewlyGenerated] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Device registration records loaded from server
  const [deviceRecords, setDeviceRecords] = useState<DeviceRecordMap>({});
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);

  // Load history on mount
  useEffect(() => {
    try {
      const savedAuth = window.sessionStorage.getItem(ADMIN_PIN_KEY);
      if (savedAuth === "true") {
        setIsAuthenticated(true);
      }
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: DEFAULT_PIN }),
      });
      const data = await res.json();
      if (data.success && data.records) {
        setDeviceRecords(data.records);
      }
    } catch (err) {
      console.error("Failed to fetch device status:", err);
    } finally {
      setIsRefreshingDevices(false);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pinInput.trim() === DEFAULT_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
      try {
        window.sessionStorage.setItem(ADMIN_PIN_KEY, "true");
      } catch {}
    } else {
      setPinError(true);
    }
  }

  function handleGenerate() {
    const keys: string[] = [];
    const now = new Date().toLocaleString("ko-KR");
    const newItems: HistoryItem[] = [];

    for (let i = 0; i < quantity; i++) {
      const k = generateLicenseKey(selectedPlan);
      keys.push(k);
      newItems.push({
        key: k,
        plan: selectedPlan,
        createdAt: now,
        memo: memo.trim() || undefined,
      });
    }

    setNewlyGenerated(keys);
    const updatedHistory = [...newItems, ...history].slice(0, 100);
    setHistory(updatedHistory);
    setMemo("");

    try {
      window.localStorage.setItem(GENERATED_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch {}
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
        body: JSON.stringify({ key, pin: DEFAULT_PIN }),
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
      {!isAuthenticated ? (
        <div className="mx-auto max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-xl flex flex-col gap-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-[26px] self-center">
            🔐
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-[20px] font-bold text-ink">관리자 인증</h1>
            <p className="text-[13px] text-ink-soft">
              이용권 발급기 접근을 위한 관리자 PIN 번호를 입력해 주세요.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="관리자 암호 입력 (기본: kig2026!)"
              className="w-full rounded-xl border border-black/15 px-4 py-3 text-center font-mono text-[16px] text-ink focus:border-ink focus:outline-none"
              autoFocus
            />

            {pinError && (
              <span className="text-[12px] text-red-600 font-semibold animate-in fade-in">
                암호가 올바르지 않습니다.
              </span>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-white hover:bg-black/80 transition-all cursor-pointer shadow-xs"
            >
              관리자 모드 접속
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
                onClick={() => {
                  sessionStorage.removeItem(ADMIN_PIN_KEY);
                  setIsAuthenticated(false);
                }}
                className="rounded-xl border border-black/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink-soft hover:text-red-600 transition-colors cursor-pointer"
              >
                로그아웃
              </button>
            </div>
          </div>

          {/* Generator Form */}
          <div className="rounded-3xl border border-black/10 bg-white p-6 sm:p-8 shadow-xs flex flex-col gap-6">
            <h2 className="text-[17px] font-bold text-ink">
              신규 이용권 코드 발급
            </h2>

            {/* Plan Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["1M", "1Y", "LIFE"] as LicensePlan[]).map((plan) => {
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
              })}
            </div>

            {/* Quantity and Memo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-ink">발급 수량</label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-ink focus:outline-none cursor-pointer"
                >
                  <option value={1}>1개 (고객 주문 1건당)</option>
                  <option value={5}>5개 (소량 묶음)</option>
                  <option value={10}>10개 (이벤트/프로모션)</option>
                  <option value={30}>30개 (단체 수강권)</option>
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
              <span>⚡ {getPlanLabel(selectedPlan)} 코드 즉시 발급하기</span>
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
                  (※ 본 이용권은 PC, 스마트폰 등 최대 2대 기기까지 등록 가능합니다)
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
                  발급된 이용권별 실시간 기기 등록 현황(최대 2대)을 확인하고 초기화할 수 있습니다.
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

            {history.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-ink-faint">
                아직 발급된 내역이 없습니다. 상단에서 코드를 발급해 보세요.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-black/[0.06] max-h-[500px] overflow-y-auto">
                {history.map((item, idx) => {
                  const record = deviceRecords[item.key];
                  const devices = record?.devices || [];
                  const deviceCount = devices.length;

                  return (
                    <div key={idx} className="flex flex-col py-3.5 gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[14px] font-bold text-ink select-all">
                              {item.key}
                            </span>
                            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10.5px] font-medium text-ink-soft">
                              {getPlanLabel(item.plan)}
                            </span>

                            {/* Device Usage Badge */}
                            {deviceCount === 0 ? (
                              <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-[10.5px] font-semibold font-mono">
                                미등록 (0/2대)
                              </span>
                            ) : deviceCount === 1 ? (
                              <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10.5px] font-semibold font-mono">
                                1/2대 사용 중
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10.5px] font-bold font-mono">
                                2/2대 만석 (한도 도달)
                              </span>
                            )}
                          </div>

                          <span className="text-[11.5px] text-ink-faint">
                            {item.createdAt} {item.memo ? `· ${item.memo}` : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.key)}
                            className="rounded-lg border border-black/10 px-2.5 py-1 text-[11.5px] font-semibold text-ink-soft hover:bg-black/5 hover:text-ink cursor-pointer transition-colors"
                          >
                            {copiedKey === item.key ? "✓ 복사됨" : "코드 복사"}
                          </button>

                          {deviceCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleResetDevice(item.key)}
                              className="rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-[11.5px] font-semibold text-red-600 hover:bg-red-500/15 cursor-pointer transition-colors"
                              title="고객이 기기를 분실/교체했을 때 기기 등록을 0대로 리셋합니다"
                            >
                              기기 초기화
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Detail list of registered devices */}
                      {devices.length > 0 && (
                        <div className="ml-1 pl-3 border-l-2 border-black/10 flex flex-col gap-1 text-[11.5px] text-ink-soft">
                          {devices.map((d, dIdx) => (
                            <div key={d.deviceId} className="flex items-center gap-2">
                              <span>📱 기기 {dIdx + 1}: <strong>{d.deviceName}</strong></span>
                              <span className="text-ink-faint">
                                (등록일: {new Date(d.registeredAt).toLocaleDateString("ko-KR")})
                              </span>
                            </div>
                          ))}
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
