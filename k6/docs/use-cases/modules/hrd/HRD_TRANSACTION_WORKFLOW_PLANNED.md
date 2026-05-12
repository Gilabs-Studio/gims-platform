# HRD Transaction Workflow Planned

## Purpose

Dokumen ini menjelaskan workflow transaksi HRD yang direncanakan untuk benchmark, tetapi belum diimplementasikan sebagai script transaction runnable saat ini.

## Current Status

Status saat ini: planned, not implemented.

Coverage HRD di suite sekarang masih berupa read access pada attendance dan leave endpoint melalui smoke/load.

## Planned HRD Flow

Flow HRD yang direncanakan di roadmap Phase 1.5 adalah attendance check-in yang timezone-aware per company.

Flow minimal yang diinginkan:

1. resolve company/employee context
2. create attendance check-in
3. validasi timezone company dipakai dengan benar
4. validasi duplicate check-in prevention

## Why HRD Needs a Transaction Flow

HRD bukan hanya endpoint CRUD biasa. Attendance menyentuh aturan bisnis yang sensitif pada:

- timezone company
- tanggal kerja efektif
- duplicate attendance prevention

## What Needs to Be Verified When Implemented

Saat nanti dibuat, test HRD sebaiknya memeriksa:

- check-in sukses pada timezone yang benar
- employee yang sama tidak bisa check-in dua kali secara tidak valid
- per-company timezone menghasilkan tanggal/waktu bisnis yang konsisten
