import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Utensils,
  Coffee,
  ShoppingBag,
  Stethoscope,
  FileText,
  Check,
  Delete,
  Equal,
  Calculator,
  PieChart,
} from "lucide-react";

// カテゴリ定義
const CATEGORIES = [
  {
    id: "food",
    label: "食費",
    icon: Utensils,
    color: "text-orange-500",
    bg: "bg-orange-100",
    hex: "#f97316",
  },
  {
    id: "entertainment",
    label: "娯楽",
    icon: Coffee,
    color: "text-purple-500",
    bg: "bg-purple-100",
    hex: "#a855f7",
  },
  {
    id: "daily",
    label: "雑費",
    icon: ShoppingBag,
    color: "text-blue-500",
    bg: "bg-blue-100",
    hex: "#3b82f6",
  },
  {
    id: "medical",
    label: "医療",
    icon: Stethoscope,
    color: "text-rose-500",
    bg: "bg-rose-100",
    hex: "#f43f5e",
  },
];

export default function AdvancedKakeibo() {
  // --- State ---
  const [transactions, setTransactions] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false); // 分析モーダル
  const [editingId, setEditingId] = useState(null);

  // --- Input Modal State ---
  const [inputDate, setInputDate] = useState(new Date());
  const [calcInput, setCalcInput] = useState("0");
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
  const [memo, setMemo] = useState("");

  // --- 初期化 & 保存 ---
  useEffect(() => {
    const saved = localStorage.getItem("kakeibo_v4_data");
    if (saved) setTransactions(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("kakeibo_v4_data", JSON.stringify(transactions));
  }, [transactions]);

  // --- 計算ロジック ---
  const calculateResult = (expression) => {
    try {
      const sanitized = expression.replace(/[^0-9+\-]/g, "");
      if (!sanitized) return "0";
      const finalExpr = sanitized.replace(/[+\-]$/, "");
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict";return (' + finalExpr + ")")();
      return String(result);
    } catch (e) {
      return expression;
    }
  };

  // --- モーダル操作 ---
  const openNewModal = (date) => {
    setEditingId(null);
    setInputDate(date);
    setCalcInput("0");
    setMemo("");
    setSelectedCategory("food");
    setIsInputModalOpen(true);
  };

  const openEditModal = (transaction) => {
    setEditingId(transaction.id);
    setInputDate(new Date(transaction.date));
    setCalcInput(String(transaction.amount));
    setMemo(transaction.memo);
    setSelectedCategory(transaction.category);
    setIsInputModalOpen(true);
  };

  const handlePadClick = (val) => {
    if (val === "C") {
      setCalcInput("0");
    } else if (val === "DEL") {
      setCalcInput((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
    } else if (val === "=") {
      setCalcInput(calculateResult(calcInput));
    } else {
      setCalcInput((prev) =>
        prev === "0" && !["+", "-"].includes(val) ? String(val) : prev + val
      );
    }
  };

  const saveTransaction = () => {
    const finalAmount = parseInt(calculateResult(calcInput), 10);
    if (isNaN(finalAmount) || finalAmount < 0) return;
    if (finalAmount === 0) return; // 0円は保存しない

    const newData = {
      id: editingId || Date.now(),
      date: inputDate.toLocaleDateString("ja-JP"),
      amount: finalAmount,
      category: selectedCategory,
      memo: memo,
    };

    if (editingId) {
      setTransactions(
        transactions.map((t) => (t.id === editingId ? newData : t))
      );
    } else {
      setTransactions([...transactions, newData]);
    }
    setIsInputModalOpen(false);
  };

  // --- データ集計処理 ---
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++)
      days.push(new Date(year, month, i));
    return days;
  };

  // 今月のデータ
  const currentMonthTransactions = useMemo(() => {
    const targetMonth = currentDate.getMonth();
    const targetYear = currentDate.getFullYear();
    return transactions
      .filter((t) => {
        const tDate = new Date(t.date);
        return (
          tDate.getMonth() === targetMonth && tDate.getFullYear() === targetYear
        );
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
  }, [transactions, currentDate]);

  const monthlyTotal = currentMonthTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  // 日次集計
  const dailyTotals = useMemo(() => {
    const map = {};
    currentMonthTransactions.forEach((t) => {
      map[t.date] = (map[t.date] || 0) + t.amount;
    });
    return map;
  }, [currentMonthTransactions]);

  // カテゴリ別集計（分析用）
  const categoryStats = useMemo(() => {
    const stats = CATEGORIES.map((cat) => {
      const total = currentMonthTransactions
        .filter((t) => t.category === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return { ...cat, total };
    });
    // 金額の大きい順にソート
    return stats.sort((a, b) => b.total - a.total);
  }, [currentMonthTransactions]);

  // 円グラフ用のCSS conic-gradient 文字列生成
  const pieChartGradient = useMemo(() => {
    if (monthlyTotal === 0) return "conic-gradient(#e2e8f0 0% 100%)";

    let gradientStr = "conic-gradient(";
    let currentPercent = 0;

    categoryStats.forEach((cat, index) => {
      const percent = (cat.total / monthlyTotal) * 100;
      const start = currentPercent;
      const end = currentPercent + percent;
      gradientStr += `${cat.hex} ${start}% ${end}%, `;
      currentPercent += percent;
    });

    return gradientStr.slice(0, -2) + ")";
  }, [categoryStats, monthlyTotal]);

  // --- UI ---
  return (
    <div className="h-screen bg-[#F2F2F7] font-sans text-slate-800 flex flex-col overflow-hidden relative">
      {/* 1. ヘッダー + カレンダー (固定エリア) */}
      <div className="flex-none bg-white shadow-sm z-10 pb-4 rounded-b-[2rem]">
        {/* 月切り替えヘッダー */}
        <div className="pt-10 pb-2 px-6 flex justify-between items-center">
          {/* Total Spending (Clickable for Stats) */}
          <button
            onClick={() => setIsStatsModalOpen(true)}
            className="text-left group active:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold tracking-wider">
              TOTAL SPENDING
              <PieChart
                size={12}
                className="text-slate-300 group-hover:text-slate-500"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight decoration-slate-200 underline decoration-2 underline-offset-4 decoration-dotted">
              ¥{monthlyTotal.toLocaleString()}
            </h1>
          </button>

          <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
            <button
              onClick={() =>
                setCurrentDate(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() - 1,
                    1
                  )
                )
              }
              className="p-2 hover:bg-white rounded-full transition shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold w-16 text-center">
              {currentDate.getMonth() + 1}月
            </span>
            <button
              onClick={() =>
                setCurrentDate(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1,
                    1
                  )
                )
              }
              className="p-2 hover:bg-white rounded-full transition shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* カレンダーグリッド */}
        <div className="px-4">
          <div className="grid grid-cols-7 mb-1">
            {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
              <div
                key={i}
                className={`text-center text-[10px] font-bold ${
                  i === 0 ? "text-rose-400" : "text-slate-300"
                }`}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentDate).map((date, i) => {
              if (!date) return <div key={i} />;
              const dateStr = date.toLocaleDateString("ja-JP");
              const total = dailyTotals[dateStr] || 0;
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <button
                  key={i}
                  onClick={() => openNewModal(date)}
                  className={`
                    h-14 rounded-lg flex flex-col items-center justify-center transition-all relative
                    ${
                      isToday
                        ? "bg-slate-800 text-white"
                        : "hover:bg-slate-50 text-slate-700"
                    }
                  `}
                >
                  <span className={`text-sm ${isToday ? "font-bold" : ""}`}>
                    {date.getDate()}
                  </span>
                  {total > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <div
                        className={`w-1 h-1 rounded-full ${
                          isToday ? "bg-emerald-400" : "bg-emerald-500"
                        }`}
                      />
                      <span
                        className={`text-[9px] ${
                          isToday ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
                        {total >= 10000
                          ? (total / 10000).toFixed(1) + "m"
                          : total}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. 履歴リスト (スクロールエリア) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {currentMonthTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
            <Calculator size={48} className="mb-2" />
            <p className="text-sm">No History</p>
          </div>
        ) : (
          currentMonthTransactions.map((t) => {
            const Cat =
              CATEGORIES.find((c) => c.id === t.category) || CATEGORIES[0];
            return (
              <div
                key={t.id}
                onClick={() => openEditModal(t)}
                className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer border border-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-full ${Cat.bg} ${Cat.color}`}>
                    <Cat.icon size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-slate-700">
                      {Cat.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {t.date} {t.memo && `• ${t.memo}`}
                    </span>
                  </div>
                </div>
                <span className="font-semibold text-slate-800">
                  ¥{t.amount.toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* 3. 入力用ハーフモーダル */}
      <ModalBase
        isOpen={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)}
        height="70vh"
      >
        {/* ヘッダー */}
        <div className="px-6 pb-2 flex justify-between items-center">
          <button
            onClick={() => setIsInputModalOpen(false)}
            className="text-slate-400 p-2"
          >
            <X size={20} />
          </button>
          <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {editingId ? "編集モード" : inputDate.toLocaleDateString("ja-JP")}
          </div>
          <div className="w-9" />
        </div>

        {/* 金額表示 */}
        <div className="px-8 py-2 flex justify-end">
          <div className="text-5xl font-light text-slate-800 tracking-tighter truncate w-full text-right">
            {calcInput}
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* カテゴリ選択 */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`
                  flex flex-col items-center justify-center py-3 rounded-2xl transition-all
                  ${
                    selectedCategory === cat.id
                      ? "bg-slate-800 text-white shadow-md"
                      : "bg-slate-50 text-slate-400"
                  }
                `}
              >
                <cat.icon
                  size={20}
                  className={
                    selectedCategory === cat.id ? "text-white" : cat.color
                  }
                />
                <span className="text-[10px] mt-1 font-medium">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>

          {/* メモ */}
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center mb-4">
            <FileText size={16} className="text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="メモ..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="bg-transparent w-full text-sm outline-none text-slate-700 placeholder:text-slate-300"
            />
          </div>

          {/* キーパッド */}
          <div className="grid grid-cols-4 gap-3">
            {["7", "8", "9"].map((n) => (
              <NumBtn key={n} val={n} onClick={handlePadClick} />
            ))}
            <NumBtn
              val="DEL"
              onClick={handlePadClick}
              icon={<Delete size={20} />}
              accent
            />
            {["4", "5", "6"].map((n) => (
              <NumBtn key={n} val={n} onClick={handlePadClick} />
            ))}
            <NumBtn val="+" onClick={handlePadClick} accent />
            {["1", "2", "3"].map((n) => (
              <NumBtn key={n} val={n} onClick={handlePadClick} />
            ))}
            <NumBtn val="-" onClick={handlePadClick} accent />
            <NumBtn val="C" onClick={handlePadClick} textAccent />
            <NumBtn val="0" onClick={handlePadClick} />
            <NumBtn
              val="="
              onClick={handlePadClick}
              accent
              icon={<Equal size={20} />}
            />
            <button
              onClick={saveTransaction}
              className="bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <Check size={24} />
            </button>
          </div>
        </div>
      </ModalBase>

      {/* 4. 分析用ハーフモーダル (New!) */}
      <ModalBase
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        height="60vh"
      >
        <div className="px-6 pb-2 flex justify-between items-center">
          <button
            onClick={() => setIsStatsModalOpen(false)}
            className="text-slate-400 p-2"
          >
            <X size={20} />
          </button>
          <div className="text-sm font-bold text-slate-700">今月の分析</div>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
          {/* 円グラフ (Donut Chart) */}
          <div className="flex justify-center mb-8 relative">
            <div
              className="w-48 h-48 rounded-full shadow-inner transition-all duration-500"
              style={{ background: pieChartGradient }}
            />
            {/* Donut Hole */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs text-slate-400 font-medium">TOTAL</span>
              <span className="text-xl font-bold text-slate-800">
                ¥{monthlyTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* カテゴリ別リスト */}
          <div className="space-y-4">
            {categoryStats.map((cat) => {
              if (cat.total === 0) return null;
              const percent = ((cat.total / monthlyTotal) * 100).toFixed(1);
              return (
                <div key={cat.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${cat.bg.replace(
                        "bg-",
                        "bg-opacity-100 bg-"
                      )}`}
                      style={{ backgroundColor: cat.hex }}
                    />
                    <span className="text-sm font-medium text-slate-600">
                      {cat.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-slate-400">
                      {percent}%
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      ¥{cat.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
            {monthlyTotal === 0 && (
              <p className="text-center text-slate-400 text-sm mt-4">
                データがありません
              </p>
            )}
          </div>
        </div>
      </ModalBase>
    </div>
  );
}

// --- コンポーネント抽出 ---

// モーダルのベースUI (Backdrop + SlideUp Sheet)
function ModalBase({ isOpen, onClose, height, children }) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`
          fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-[2.5rem] shadow-2xl 
          transform transition-transform duration-300 ease-out flex flex-col
          ${isOpen ? "translate-y-0" : "translate-y-full"}
        `}
        style={{ height: height }}
      >
        <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>
        {children}
      </div>
    </>
  );
}

function NumBtn({ val, onClick, accent, textAccent, icon }) {
  return (
    <button
      onClick={() => onClick(val)}
      className={`
        h-14 rounded-2xl text-xl font-medium flex items-center justify-center transition-all active:scale-95
        ${
          accent
            ? "bg-slate-200 text-slate-600"
            : "bg-white text-slate-700 shadow-sm border border-slate-100"
        }
        ${textAccent ? "text-rose-500" : ""}
      `}
    >
      {icon ? icon : val}
    </button>
  );
}
