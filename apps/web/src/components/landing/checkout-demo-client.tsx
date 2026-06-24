"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import confetti from "canvas-confetti";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  CreditCard,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Building2,
  User,
  Mail,
  Phone,
  Receipt,
  QrCode,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

const PLANS_MAP: Record<string, { nameEn: string; nameId: string; monthly: number; yearly: number }> = {
  pos_growth: {
    nameEn: "POS Modular Plan",
    nameId: "Plan Modular POS",
    monthly: 79000,
    yearly: 853200,
  },
  erp_pro: {
    nameEn: "ERP Modular Plan",
    nameId: "Plan Modular ERP",
    monthly: 109000,
    yearly: 1177200,
  },
  crm_growth: {
    nameEn: "CRM Modular Plan",
    nameId: "Plan Modular CRM",
    monthly: 89000,
    yearly: 961200,
  },
  hr_growth: {
    nameEn: "HR Modular Plan",
    nameId: "Plan Modular HR",
    monthly: 89000,
    yearly: 961200,
  },
  growth_suite: {
    nameEn: "Growth Suite Bundle",
    nameId: "Bundle Growth Suite",
    monthly: 125000,
    yearly: 1350000,
  },
  ultimate_suite: {
    nameEn: "Ultimate Suite Bundle",
    nameId: "Bundle Ultimate Suite",
    monthly: 175000,
    yearly: 1890000,
  },
};

type CheckoutStatus = "idle" | "processing" | "success";
type PaymentMethod = "xendit_va" | "credit_card" | "qris";

export function CheckoutDemoClient({ locale }: { locale: string }) {
  const isId = locale === "id";
  const searchParams = useSearchParams();

  // Get plan details from URL params
  const planSlug = searchParams.get("plan") || "ultimate_suite";
  const usersCountParam = parseInt(searchParams.get("users") || "1", 10);
  const usersCount = isNaN(usersCountParam) || usersCountParam < 1 ? 1 : usersCountParam;
  const billingCycle = (searchParams.get("billing") || "monthly") === "yearly" ? "yearly" : "monthly";

  const activePlan = PLANS_MAP[planSlug] || PLANS_MAP.ultimate_suite;
  const planName = isId ? activePlan.nameId : activePlan.nameEn;
  const planPricePerSeat = billingCycle === "yearly" ? activePlan.yearly / 12 : activePlan.monthly;

  // Calculate prices
  const unitPrice = planPricePerSeat;
  const subtotal = unitPrice * usersCount;
  const finalTotal = billingCycle === "yearly" ? activePlan.yearly * usersCount : activePlan.monthly * usersCount;
  const isDiscounted = billingCycle === "yearly";
  const originalAnnualTotal = activePlan.monthly * usersCount * 12;

  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("xendit_va");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>("idle");
  const [invoiceNumber] = useState(() => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `INV-${new Date().getFullYear()}-${randomNum}`;
  });

  // Credit card inputs (only active if credit card is selected)
  const [ccData, setCcData] = useState({
    number: "",
    expiry: "",
    cvc: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleCcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Basic cc masking
    if (name === "number") {
      const sanitized = value.replace(/\D/g, "").slice(0, 16);
      const formatted = sanitized.match(/.{1,4}/g)?.join(" ") || sanitized;
      setCcData((prev) => ({ ...prev, number: formatted }));
    } else if (name === "expiry") {
      const sanitized = value.replace(/\D/g, "").slice(0, 4);
      const formatted = sanitized.length >= 3 ? `${sanitized.slice(0, 2)}/${sanitized.slice(2)}` : sanitized;
      setCcData((prev) => ({ ...prev, expiry: formatted }));
    } else if (name === "cvc") {
      const sanitized = value.replace(/\D/g, "").slice(0, 4);
      setCcData((prev) => ({ ...prev, cvc: sanitized }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = isId ? "Nama lengkap wajib diisi" : "Full name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = isId ? "Email bisnis wajib diisi" : "Business email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = isId ? "Format email tidak valid" : "Invalid email format";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = isId ? "Nomor telepon wajib diisi" : "Phone number is required";
    }
    if (!formData.companyName.trim()) {
      newErrors.companyName = isId ? "Nama perusahaan wajib diisi" : "Company name is required";
    }

    if (paymentMethod === "credit_card") {
      if (!ccData.number || ccData.number.replace(/\s/g, "").length < 16) {
        newErrors.ccNumber = isId ? "Nomor kartu tidak valid" : "Invalid card number";
      }
      if (!ccData.expiry || ccData.expiry.length < 5) {
        newErrors.ccExpiry = isId ? "Format kedaluwarsa salah" : "Invalid expiry";
      }
      if (!ccData.cvc || ccData.cvc.length < 3) {
        newErrors.ccCvc = isId ? "CVC tidak valid" : "Invalid CVC";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setCheckoutStatus("processing");

    // Simulate Xendit transaction delay
    setTimeout(() => {
      setCheckoutStatus("success");
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#10b981", "#6366f1", "#f59e0b"]
      });
    }, 1500);
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  if (checkoutStatus === "success") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-20">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-success" />
          
          <div className="flex flex-col items-center text-center mt-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">
              {isId ? "Pembayaran Berhasil!" : "Payment Successful!"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              {isId 
                ? "Terima kasih! Langganan SalesView Anda telah aktif. Invoice resmi telah dikirim ke email Anda." 
                : "Thank you! Your SalesView subscription is now active. The official invoice has been sent to your email."}
            </p>
          </div>

          <hr className="my-6 border-border/80" />

          {/* Receipt Info */}
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{isId ? "Nomor Invoice" : "Invoice Number"}</span>
              <span className="font-mono font-semibold text-foreground">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{isId ? "Metode Pembayaran" : "Payment Method"}</span>
              <span className="font-medium text-foreground">
                {paymentMethod === "xendit_va" ? "Xendit Virtual Account (Sandbox)" : paymentMethod === "credit_card" ? "Credit Card (Sandbox)" : "QRIS (Sandbox)"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{isId ? "Status Transaksi" : "Transaction Status"}</span>
              <Badge className="bg-success text-success-foreground font-semibold px-2 py-0.5 border-0">
                {isId ? "LUNAS" : "PAID"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{isId ? "Tanggal Transaksi" : "Transaction Date"}</span>
              <span className="text-foreground font-medium">{new Date().toLocaleDateString(isId ? "id-ID" : "en-US", { dateStyle: "long" })}</span>
            </div>

            <hr className="border-border/60" />

            <div className="bg-muted/40 p-4 rounded-lg space-y-2.5">
              <p className="font-semibold text-xs text-foreground uppercase tracking-wider">{isId ? "Detail Pelanggan" : "Customer Details"}</p>
              <div className="grid grid-cols-2 gap-y-1.5 text-xs text-muted-foreground">
                <span>{isId ? "Nama" : "Name"}</span>
                <span className="text-foreground text-right font-medium">{formData.fullName}</span>
                <span>Email</span>
                <span className="text-foreground text-right font-medium break-all">{formData.email}</span>
                <span>{isId ? "Perusahaan" : "Company"}</span>
                <span className="text-foreground text-right font-medium">{formData.companyName}</span>
                <span>{isId ? "Nomor Telp" : "Phone"}</span>
                <span className="text-foreground text-right font-medium">{formData.phone}</span>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-2.5">
              <p className="font-semibold text-xs text-primary uppercase tracking-wider">{isId ? "Produk yang Dibeli" : "Purchased Plan"}</p>
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-foreground">{planName}</span>
                  <span className="text-muted-foreground block mt-0.5">
                    {usersCount} {isId ? "Pengguna" : "Users"} × {formatIDR(unitPrice)} / {isId ? "bulan" : "month"}
                  </span>
                </div>
                <span className="font-bold text-foreground">
                  {formatIDR(finalTotal)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-base font-bold text-foreground pt-2">
              <span>{isId ? "Total Bayar" : "Amount Paid"}</span>
              <span className="text-lg text-primary">{formatIDR(finalTotal)}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all">
                {isId ? "Kembali ke Beranda" : "Return to Home"}
              </Button>
            </Link>
            <Button 
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }} 
              className="flex-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95 hover:-translate-y-0.5 active:translate-y-0 transition-all font-semibold"
            >
              {isId ? "Cetak Invoice" : "Print Invoice"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium">
          <ArrowLeft className="h-4 w-4" />
          {isId ? "Kembali ke Harga" : "Back to Pricing"}
        </Link>
      </div>

      {/* Top Banner */}
      <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs sm:text-sm text-muted-foreground flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
        <p>
          <strong>{isId ? "Checkout Demo / Uji Coba:" : "Checkout Demo / Sandbox:"}</strong>{" "}
          {isId 
            ? "Ini adalah halaman checkout simulasi untuk proses verifikasi. Transaksi ini gratis dan tidak membebankan biaya asli." 
            : "This is a checkout simulation for verification purposes. Transactions are free and sandbox-only."}
        </p>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {isId ? "Checkout Langganan" : "Subscription Checkout"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isId 
          ? "Selesaikan data di bawah untuk mengaktifkan paket SalesView Anda." 
          : "Complete the details below to deploy your SalesView instance."}
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Form (7 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-8">
          
          {/* Step 1: Account Info */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-6">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
              {isId ? "Informasi Pelanggan & Bisnis" : "Customer & Business Information"}
            </h2>

            <FieldGroup className="space-y-4">
              <Field className="space-y-2">
                <FieldLabel htmlFor="fullName" className="text-sm font-semibold">
                  {isId ? "Nama Lengkap" : "Full Name"}
                </FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-muted-foreground">
                    <User className="h-4 w-4" />
                  </span>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder={isId ? "Contoh: Budi Santoso" : "e.g., John Doe"}
                    className="pl-9 h-10"
                  />
                </div>
                {errors.fullName && <FieldError>{errors.fullName}</FieldError>}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field className="space-y-2">
                  <FieldLabel htmlFor="email" className="text-sm font-semibold">
                    {isId ? "Email Bisnis" : "Business Email"}
                  </FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </span>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="budi@company.com"
                      className="pl-9 h-10"
                    />
                  </div>
                  {errors.email && <FieldError>{errors.email}</FieldError>}
                </Field>

                <Field className="space-y-2">
                  <FieldLabel htmlFor="phone" className="text-sm font-semibold">
                    {isId ? "Nomor Telepon" : "Phone Number"}
                  </FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                    </span>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="08123456789"
                      className="pl-9 h-10"
                    />
                  </div>
                  {errors.phone && <FieldError>{errors.phone}</FieldError>}
                </Field>
              </div>

              <Field className="space-y-2">
                <FieldLabel htmlFor="companyName" className="text-sm font-semibold">
                  {isId ? "Nama Perusahaan / Organisasi" : "Company / Organization Name"}
                </FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder={isId ? "PT Sukses Bersama" : "e.g., Acme Corporation"}
                    className="pl-9 h-10"
                  />
                </div>
                {errors.companyName && <FieldError>{errors.companyName}</FieldError>}
              </Field>
            </FieldGroup>
          </div>

          {/* Step 2: Payment Method */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-6">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
              {isId ? "Metode Pembayaran (Integrasi Xendit)" : "Payment Method (Xendit Integration)"}
            </h2>

            {/* Payment Method Cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Virtual Account */}
              <div
                onClick={() => setPaymentMethod("xendit_va")}
                className={cn(
                  "border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:border-primary/50",
                  paymentMethod === "xendit_va" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                )}
              >
                <div className={cn("p-2 rounded-full mb-2.5", paymentMethod === "xendit_va" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-foreground">Virtual Account</span>
                <span className="text-[10px] text-muted-foreground mt-1">Xendit VA (Automatic)</span>
              </div>

              {/* Credit Card */}
              <div
                onClick={() => setPaymentMethod("credit_card")}
                className={cn(
                  "border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:border-primary/50",
                  paymentMethod === "credit_card" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                )}
              >
                <div className={cn("p-2 rounded-full mb-2.5", paymentMethod === "credit_card" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-foreground">{isId ? "Kartu Kredit" : "Credit Card"}</span>
                <span className="text-[10px] text-muted-foreground mt-1">Visa, Mastercard</span>
              </div>

              {/* QRIS */}
              <div
                onClick={() => setPaymentMethod("qris")}
                className={cn(
                  "border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:border-primary/50",
                  paymentMethod === "qris" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                )}
              >
                <div className={cn("p-2 rounded-full mb-2.5", paymentMethod === "qris" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                  <QrCode className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-foreground">QRIS</span>
                <span className="text-[10px] text-muted-foreground mt-1">GoPay, OVO, ShopeePay</span>
              </div>
            </div>

            {/* Content per payment method */}
            <div className="mt-6 border-t border-border/50 pt-5">
              {paymentMethod === "xendit_va" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isId 
                      ? "Kode Virtual Account unik (Mandiri, BCA, BNI, BRI, Permata) akan secara otomatis dibuat melalui API Xendit setelah Anda menekan tombol bayar." 
                      : "A unique Virtual Account code (BCA, Mandiri, BNI, BRI) will be instantly generated using Xendit API once you submit."}
                  </p>
                  <div className="flex gap-2 items-center text-[10px] text-success font-medium bg-success/5 border border-success/20 p-2 rounded-lg mt-2">
                    <Check className="h-3 w-3" />
                    <span>{isId ? "Auto-konfirmasi instan" : "Instant payment reconciliation enabled"}</span>
                  </div>
                </div>
              )}

              {paymentMethod === "qris" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isId 
                      ? "Barcode QRIS dinamis akan ditampilkan di layar untuk Anda scan dengan aplikasi mobile banking atau e-wallet (GoPay, OVO, DANA, dll)." 
                      : "A dynamic QRIS barcode will be presented on screen. Scan using e-wallets or mobile banking apps."}
                  </p>
                </div>
              )}

              {paymentMethod === "credit_card" && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    {isId ? "Simulasi Pembayaran Kartu Kredit Sandbox" : "Sandbox Credit Card simulation"}
                  </p>
                  
                  <FieldGroup className="space-y-3">
                    <Field className="space-y-1">
                      <FieldLabel htmlFor="ccNumber" className="text-xs font-semibold">{isId ? "Nomor Kartu" : "Card Number"}</FieldLabel>
                      <Input
                        id="ccNumber"
                        name="number"
                        type="text"
                        value={ccData.number}
                        onChange={handleCcChange}
                        placeholder="4111 1111 1111 1111"
                        className="h-9 text-sm"
                      />
                      {errors.ccNumber && <FieldError className="text-xs">{errors.ccNumber}</FieldError>}
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field className="space-y-1">
                        <FieldLabel htmlFor="ccExpiry" className="text-xs font-semibold">{isId ? "Kedaluwarsa" : "Expiry (MM/YY)"}</FieldLabel>
                        <Input
                          id="ccExpiry"
                          name="expiry"
                          type="text"
                          value={ccData.expiry}
                          onChange={handleCcChange}
                          placeholder="MM/YY"
                          className="h-9 text-sm text-center"
                        />
                        {errors.ccExpiry && <FieldError className="text-xs">{errors.ccExpiry}</FieldError>}
                      </Field>

                      <Field className="space-y-1">
                        <FieldLabel htmlFor="ccCvc" className="text-xs font-semibold">CVC</FieldLabel>
                        <Input
                          id="ccCvc"
                          name="cvc"
                          type="text"
                          value={ccData.cvc}
                          onChange={handleCcChange}
                          placeholder="123"
                          className="h-9 text-sm text-center"
                        />
                        {errors.ccCvc && <FieldError className="text-xs">{errors.ccCvc}</FieldError>}
                      </Field>
                    </div>
                  </FieldGroup>
                </div>
              )}
            </div>
          </div>

          {/* Form Action Button */}
          <Button
            type="submit"
            disabled={checkoutStatus === "processing"}
            className="w-full h-12 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95 text-base font-bold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg hover:shadow-primary/30"
          >
            {checkoutStatus === "processing" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {isId ? "Memproses Transaksi Xendit..." : "Processing Xendit Transaction..."}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-5 w-5" />
                {isId ? `Bayar Sekarang ${formatIDR(finalTotal)}` : `Pay Now ${formatIDR(finalTotal)}`}
              </span>
            )}
          </Button>
        </form>

        {/* Right Order Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs sticky top-24">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4 border-b border-border/60 pb-3">
              <Receipt className="h-5 w-5 text-primary" />
              {isId ? "Ringkasan Pesanan" : "Order Summary"}
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm text-foreground">{planName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isId ? "Paket langganan bisnis" : "Business plan subscription"}
                  </p>
                </div>
                <Badge className="bg-primary/10 text-primary font-semibold hover:bg-primary/10 text-xs px-2 py-0.5 border-0">
                  {billingCycle === "yearly" ? (isId ? "Tahunan" : "Yearly") : (isId ? "Bulanan" : "Monthly")}
                </Badge>
              </div>

              <div className="space-y-2 text-xs border-y border-border/50 py-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>{isId ? "Harga per seat" : "Price per seat"}</span>
                  <span className="font-medium text-foreground">
                    {formatIDR(unitPrice)} / {isId ? "bulan" : "mo"}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{isId ? "Jumlah Seat / Pengguna" : "Number of Seats"}</span>
                  <span className="font-medium text-foreground">{usersCount}</span>
                </div>

                {isDiscounted && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{isId ? "Durasi Langganan" : "Duration"}</span>
                    <span className="font-medium text-foreground">12 {isId ? "Bulan" : "Months"}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatIDR(isDiscounted ? originalAnnualTotal : subtotal)}</span>
                </div>

                {isDiscounted && (
                  <div className="flex justify-between text-success font-semibold">
                    <span>{isId ? "Diskon Tahunan (10%)" : "Yearly Discount (10%)"}</span>
                    <span>-{formatIDR(originalAnnualTotal - finalTotal)}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>{isId ? "PPN (0% Demo)" : "VAT (0% Demo)"}</span>
                  <span>IDR 0</span>
                </div>
              </div>

              <hr className="border-border/60" />

              <div className="flex justify-between items-baseline pt-1">
                <span className="font-bold text-sm text-foreground">{isId ? "Total Tagihan" : "Total Invoice"}</span>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-primary block">
                    {formatIDR(finalTotal)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 mt-0.5 block">
                    {billingCycle === "yearly" ? (isId ? "ditagih per tahun" : "billed annually") : (isId ? "ditagih per bulan" : "billed monthly")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-muted/30 p-3 rounded-lg border border-border/40 text-[10px] text-muted-foreground leading-relaxed">
              <p className="flex gap-1.5 items-start">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span>
                  {isId 
                    ? "Dengan melanjutkan, Anda menyetujui Ketentuan Layanan. Platform diproses melalui sandbox payment gateway." 
                    : "By proceeding, you agree to the Terms of Service. Payment will be simulated in secure sandbox environment."}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
