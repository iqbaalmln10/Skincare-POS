import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import { API_BASE } from "../lib/api";
import CurrencyInput from "../components/CurrencyInput";
import "./ExpensesPage.css";

interface Expense {
  id: number;
  userId: number;
  userName: string;
  shiftId: number | null;
  description: string;
  amount: number;
  createdAt: string;
}

function formatRp(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}

// Backend kirim format "YYYY-MM-DD HH:MM:SS" (SQLite datetime), butuh "T"
// sebagai pemisah supaya bisa diparse jadi Date yang valid di semua browser.
function formatDateID(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function formatTimeID(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | "">("");

  const [startDate, setStartDate] = useState(firstOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());

  function loadExpenses() {
    setIsLoading(true);
    axios
      .get(`${API_BASE}/expenses`, { params: { startDate, endDate } })
      .then((res) => {
        setExpenses(res.data.data);
        setErrorMsg(null);
      })
      .catch(() => setErrorMsg("Gagal memuat data pengeluaran dari server"))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const stats = useMemo(() => {
    const today = todayISO();
    const totalToday = expenses
      .filter((e) => e.createdAt.slice(0, 10) === today)
      .reduce((s, e) => s + e.amount, 0);
    const totalRange = expenses.reduce((s, e) => s + e.amount, 0);
    const count = expenses.length;
    return { totalToday, totalRange, count };
  }, [expenses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount || Number(amount) <= 0) {
      setErrorMsg("Isi keterangan dan nominal pengeluaran dengan benar");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/expenses`, {
        description: description.trim(),
        amount: Number(amount),
      });
      // Entri baru cuma dimasukkan ke daftar kalau ada di dalam rentang
      // filter tanggal yang sedang aktif (biasanya iya, karena default-nya
      // bulan berjalan s/d hari ini).
      const newRow: Expense = res.data.data;
      const today = todayISO();
      if (today >= startDate && today <= endDate) {
        setExpenses((prev) => [newRow, ...prev]);
      }
      setDescription("");
      setAmount("");
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal menyimpan pengeluaran");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Yakin ingin menghapus catatan pengeluaran ini?")) return;

    try {
      await axios.delete(`${API_BASE}/expenses/${id}`);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal menghapus pengeluaran");
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Pengeluaran Operasional</h1>
        <p>Catat pengeluaran operasional toko — sewa, listrik, perlengkapan, dan lainnya</p>
      </div>

      {errorMsg && (
        <div className="card" style={{ borderColor: "#e5484d", color: "#e5484d", marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      <div className="grid-3">
        <div className="card kpi-card">
          <div className="kpi-label">Pengeluaran Hari Ini</div>
          <div className="kpi-value">{formatRp(stats.totalToday)}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Total Pengeluaran (Rentang Filter)</div>
          <div className="kpi-value">{formatRp(stats.totalRange)}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Jumlah Entri</div>
          <div className="kpi-value">{stats.count}</div>
        </div>
      </div>

      <div className="grid-2 expenses-grid mt-20">
        <div className="card">
          <div className="card-title-row">
            <h3>Tambah Pengeluaran</h3>
          </div>

          <form onSubmit={handleSubmit} className="customer-form">
            <label>Keterangan</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="cth. Bayar listrik toko bulan ini"
              rows={2}
              required
            />

            <label>Nominal</label>
            <CurrencyInput value={amount} onChange={setAmount} placeholder="0" required />

            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: 16 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Pengeluaran"}
            </button>
          </form>

          <p className="muted expenses-hint">
            Pengeluaran yang dicatat otomatis masuk ke Total Pengeluaran &amp; Laba Bersih di Dasbor,
            dan tercatat di menu Laporan &gt; Pengeluaran Operasional.
          </p>
        </div>

        <div className="card">
          <div className="card-title-row">
            <h3>Riwayat Pengeluaran</h3>
            <span className="muted">{expenses.length} entri</span>
          </div>

          <div className="card date-range-card expenses-date-filter">
            <label>Dari</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <label>Sampai</label>
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Keterangan</th>
                <th>Dicatat Oleh</th>
                <th>Jumlah</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="empty-row">Memuat data...</td>
                </tr>
              )}
              {!isLoading &&
                expenses.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {formatDateID(e.createdAt)}
                      <div className="expense-time">{formatTimeID(e.createdAt)}</div>
                    </td>
                    <td>{e.description}</td>
                    <td>{e.userName}</td>
                    <td>{formatRp(e.amount)}</td>
                    {isAdmin && (
                      <td>
                        <button className="icon-btn danger" onClick={() => handleDelete(e.id)} title="Hapus">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              {!isLoading && expenses.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="empty-row">
                    Belum ada pengeluaran di rentang tanggal ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
