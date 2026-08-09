import { useEffect, useState } from "react";
import "./CurrencyInput.css";

interface CurrencyInputProps {
  value: number | "";
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  required?: boolean;
}

const formatter = new Intl.NumberFormat("id-ID");

// Input nominal Rupiah: tampilan selalu "Rp150.000", tapi disimpan sebagai
// angka mentah (150000) di state pemanggil. Hindari <input type="number">
// polos karena tidak bisa dikasih pemisah ribuan dan gampang salah baca
// nominal besar (lihat keluhan Iqbal soal validasi field nominal).
export default function CurrencyInput({
  value,
  onChange,
  placeholder,
  disabled,
  id,
  required,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(() => (value === "" ? "" : formatter.format(value)));

  // Sinkronkan tampilan kalau value berubah dari luar (mis. reset form,
  // atau prefill saat masuk mode edit) — bukan dari ketikan user sendiri.
  useEffect(() => {
    setDisplay(value === "" ? "" : formatter.format(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
    if (!digitsOnly) {
      setDisplay("");
      onChange(0);
      return;
    }
    const numeric = Number(digitsOnly);
    setDisplay(formatter.format(numeric));
    onChange(numeric);
  }

  return (
    <div className="currency-input">
      <span className="currency-prefix">Rp</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder ?? "0"}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}
