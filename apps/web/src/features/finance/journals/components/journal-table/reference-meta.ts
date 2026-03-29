/**
 * Reference type display metadata for journal rows (short code + badge styling).
 */
export function getReferenceSourceMeta(type: string | null) {
  if (!type) {
    return {
      shortLabel: "—",
      label: "Unknown",
      title: "Unknown Source",
      color: "bg-muted text-muted-foreground border-border",
    };
  }

  const value = type.toUpperCase();
  const compact = value.replace(/[^A-Z0-9]/g, "");

  if (compact === "SALESPAYMENT" || compact === "SALES_PAYMENT") {
    return {
      shortLabel: "PAY",
      label: "Payment SO",
      title: "Sales Order Payment",
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    };
  }
  if (compact === "PURCHASEPAYMENT" || compact === "PURCHASE_PAYMENT") {
    return {
      shortLabel: "PAY",
      label: "Payment PO",
      title: "Purchase Order Payment",
      color: "bg-lime-500/10 text-lime-600 border-lime-500/20",
    };
  }
  if (compact === "SALESINVOICE" || compact === "SALES_INVOICE") {
    return {
      shortLabel: "SI",
      label: "Invoice SO",
      title: "Sales Invoice",
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    };
  }
  if (compact === "SALESINVOICEDP" || compact === "SALES_INVOICE_DP") {
    return {
      shortLabel: "SI-DP",
      label: "Invoice DP SO",
      title: "Sales Down Payment Invoice",
      color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    };
  }
  if (compact === "SUPPLIERINVOICE" || compact === "SUPPLIER_INVOICE") {
    return {
      shortLabel: "PI",
      label: "Invoice PO",
      title: "Supplier Invoice",
      color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };
  }
  if (compact === "SUPPLIERINVOICEDP" || compact === "SUPPLIER_INVOICE_DP") {
    return {
      shortLabel: "PI-DP",
      label: "Invoice DP PO",
      title: "Supplier Down Payment Invoice",
      color: "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20",
    };
  }
  if (compact === "PAYMENT") {
    return {
      shortLabel: "PAY",
      label: "Payment Finance",
      title: "Finance Payment",
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    };
  }
  if (compact === "DO" || compact.includes("DELIVERY")) {
    return {
      shortLabel: "DO",
      label: "Delivery SO",
      title: "Delivery Order",
      color: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    };
  }
  if (compact.includes("GOODSRECEIPT") || compact === "GR") {
    return {
      shortLabel: "GR",
      label: "Receipt PO",
      title: "Goods Receipt",
      color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    };
  }
  if (
    compact === "CASHIN" ||
    compact === "CASHOUT" ||
    compact === "TRANSFER" ||
    compact === "CASHBANK" ||
    compact === "CASH_BANK" ||
    compact === "CB" ||
    compact === "TRF"
  ) {
    return {
      shortLabel: "CB",
      label: compact === "TRF" || compact === "TRANSFER" ? "Transfer Bank" : "Cash/Bank",
      title: "Cash & Bank Transaction",
      color: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    };
  }
  if (compact.includes("ADJUST") || compact === "CORRECTION" || compact === "MANUAL_ADJUSTMENT") {
    return {
      shortLabel: "ADJ",
      label: "Adjustment",
      title: "Adjustment Journal",
      color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    };
  }
  if (compact.includes("VALUATION") || compact.includes("REVALUATION") || compact.includes("COST_ADJUSTMENT")) {
    return {
      shortLabel: "VAL",
      label: "Valuation",
      title: "Valuation Journal",
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    };
  }
  if (compact === "SO" || compact.includes("SALESORDER")) {
    return {
      shortLabel: "SO",
      label: "SO",
      title: "Sales Order",
      color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    };
  }
  if (compact === "PO" || compact.includes("PURCHASEORDER")) {
    return {
      shortLabel: "PO",
      label: "PO",
      title: "Purchase Order",
      color: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    };
  }
  if (compact.includes("STOCK") && compact.includes("OPNAME")) {
    return {
      shortLabel: "OP",
      label: "Stock Opname",
      title: "Stock Opname",
      color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    };
  }
  if (compact.includes("CLOSING")) {
    return {
      shortLabel: "CL",
      label: "Closing",
      title: "Financial Closing",
      color: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    };
  }

  return {
    shortLabel: value.length <= 6 ? value : `${value.slice(0, 6)}…`,
    label: value,
    title: value,
    color: "bg-secondary text-secondary-foreground border-border",
  };
}
