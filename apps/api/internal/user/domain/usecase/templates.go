package usecase

const DeletionRequestEmailTemplate = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Konfirmasi Penghapusan Akun Anda</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=SF+Pro+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background-color: #F5F5F7;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, 'Plus Jakarta Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    padding: 64px 16px;
    color: #1D1D1F;
  }
  .wrapper {
    max-width: 480px;
    margin: 0 auto;
  }
  .card {
    background: #FFFFFF;
    border-radius: 28px;
    overflow: hidden;
    border: 1px solid #E8E8ED;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
    padding: 44px 40px;
  }
  .hero-icon-wrap {
    width: 48px;
    height: 48px;
    background: #FFF0F0;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
  }
  .hero-icon-wrap svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: #FF3B30;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .hero-title {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    font-weight: 700;
    font-size: 28px;
    color: #1D1D1F;
    letter-spacing: -0.6px;
    line-height: 1.25;
    margin-bottom: 12px;
  }
  .hero-subtitle {
    color: #86868B;
    font-size: 15px;
    font-weight: 400;
    line-height: 1.5;
    margin-bottom: 32px;
  }
  .greeting {
    font-weight: 600;
    font-size: 16px;
    color: #1D1D1F;
    margin-bottom: 12px;
  }
  .body-text {
    font-size: 15px;
    color: #515154;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .info-box {
    background: #FFF0F0;
    border-radius: 16px;
    padding: 16px 20px;
    margin: 32px 0;
    border: 1px solid #FFD5D5;
  }
  .info-text {
    font-size: 13.5px;
    color: #FF3B30;
    line-height: 1.55;
    font-weight: 500;
  }
  .cta-wrap {
    text-align: left;
    margin: 32px 0 40px 0;
  }
  .cta-btn {
    display: inline-block;
    background: #FF3B30;
    color: #FFFFFF !important;
    text-decoration: none;
    font-weight: 600;
    font-size: 15px;
    padding: 14px 32px;
    border-radius: 22px;
    transition: background-color 0.15s ease;
  }
  .divider {
    height: 1px;
    background: #E8E8ED;
    margin: 32px 0;
  }
  .fallback {
    margin-bottom: 32px;
  }
  .fallback-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #86868B;
    margin-bottom: 8px;
  }
  .fallback-url {
    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace;
    font-size: 12.5px;
    color: #FF3B30;
    word-break: break-all;
    line-height: 1.5;
  }
  .footer {
    margin-top: 24px;
    padding: 0 8px;
  }
  .footer p {
    font-size: 12px;
    color: #86868B;
    line-height: 1.6;
    margin-bottom: 6px;
  }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="hero-icon-wrap">
      <svg viewBox="0 0 24 24">
        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
      </svg>
    </div>
    <h1 class="hero-title">Konfirmasi<br>penghapusan akun.</h1>
    <p class="hero-subtitle">Kami menerima permintaan untuk menghapus akun Salesview Anda secara permanen.</p>
    <p class="greeting">Halo, {{.Name}}</p>
    <p class="body-text">Anda (atau seseorang yang memiliki akses ke akun Anda) meminta penghapusan akun yang terhubung dengan <span style="color: #1D1D1F; font-weight: 500;">{{.Email}}</span>.</p>
    <p class="body-text">Untuk memverifikasi dan melanjutkan proses ini, silakan klik tombol konfirmasi di bawah ini.</p>
    <div class="cta-wrap">
      <a href="{{.ConfirmLink}}" class="cta-btn">Konfirmasi Hapus Akun</a>
    </div>
    <div class="info-box">
      <p class="info-text">Tautan konfirmasi ini hanya berlaku selama 24 jam. Jika Anda tidak mengeklik tautan ini, permintaan penghapusan akan dibatalkan otomatis dan akun Anda tetap aman.</p>
    </div>
    <div class="divider"></div>
    <div class="fallback">
      <div class="fallback-label">Tautan Alternatif</div>
      <div class="fallback-url">{{.ConfirmLink}}</div>
    </div>
  </div>
  <div class="footer">
    <p>Email ini dikirim ke <span style="color: #515154;">{{.Email}}</span> untuk tujuan verifikasi keamanan.</p>
    <p>&copy; {{.Year}} PT Griya Innovation Labs. All rights reserved.</p>
  </div>
</div>
</body>
</html>`

const DeletionPendingEmailTemplate = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Akun Anda Dinonaktifkan (Masa Tenggang)</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=SF+Pro+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background-color: #F5F5F7;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, 'Plus Jakarta Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    padding: 64px 16px;
    color: #1D1D1F;
  }
  .wrapper {
    max-width: 480px;
    margin: 0 auto;
  }
  .card {
    background: #FFFFFF;
    border-radius: 28px;
    overflow: hidden;
    border: 1px solid #E8E8ED;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
    padding: 44px 40px;
  }
  .hero-icon-wrap {
    width: 48px;
    height: 48px;
    background: #FFF4E5;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
  }
  .hero-icon-wrap svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: #FF9500;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .hero-title {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    font-weight: 700;
    font-size: 28px;
    color: #1D1D1F;
    letter-spacing: -0.6px;
    line-height: 1.25;
    margin-bottom: 12px;
  }
  .hero-subtitle {
    color: #86868B;
    font-size: 15px;
    font-weight: 400;
    line-height: 1.5;
    margin-bottom: 32px;
  }
  .greeting {
    font-weight: 600;
    font-size: 16px;
    color: #1D1D1F;
    margin-bottom: 12px;
  }
  .body-text {
    font-size: 15px;
    color: #515154;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .info-box {
    background: #F5F5F7;
    border-radius: 16px;
    padding: 16px 20px;
    margin: 32px 0;
  }
  .info-text {
    font-size: 13.5px;
    color: #515154;
    line-height: 1.55;
  }
  .divider {
    height: 1px;
    background: #E8E8ED;
    margin: 32px 0;
  }
  .footer {
    margin-top: 24px;
    padding: 0 8px;
  }
  .footer p {
    font-size: 12px;
    color: #86868B;
    line-height: 1.6;
    margin-bottom: 6px;
  }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="hero-icon-wrap">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <h1 class="hero-title">Akun Anda<br>telah dinonaktifkan.</h1>
    <p class="hero-subtitle">Proses penghapusan akun telah dimulai dan akun Anda sekarang berada dalam masa tenggang.</p>
    <p class="greeting">Halo, {{.Name}}</p>
    <p class="body-text">Kami ingin menginformasikan bahwa akun Anda yang terhubung dengan <span style="color: #1D1D1F; font-weight: 500;">{{.Email}}</span> telah berhasil dinonaktifkan.</p>
    <p class="body-text">Mulai saat ini, seluruh sesi login Anda telah dicabut, langganan billing dibatalkan, dan akses login diblokir. Namun, seluruh data Anda masih tersimpan dengan aman di database kami.</p>
    <div class="info-box">
      <p class="info-text">Sesuai kebijakan kami, akun Anda berada dalam <strong>masa tenggang 30 hari</strong> hingga tanggal <strong style="color: #1D1D1F;">{{.ScheduledDate}}</strong>. Jika Anda berubah pikiran dan ingin membatalkan penghapusan, silakan hubungi tim Support kami sebelum tanggal tersebut.</p>
    </div>
    <p class="body-text" style="color: #86868B; font-size: 13.5px;">Setelah 30 hari, seluruh data pribadi Anda (PII), token sesi, dan berkas unggahan akan dihapus permanen secara otomatis.</p>
  </div>
  <div class="footer">
    <p>PT Griya Innovation Labs &middot; Hubungi support@gilabs.id jika Anda membutuhkan bantuan pemulihan.</p>
    <p>&copy; {{.Year}} PT Griya Innovation Labs. All rights reserved.</p>
  </div>
</div>
</body>
</html>`

const DeletionRecoveredEmailTemplate = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Akun Anda Telah Dipulihkan</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=SF+Pro+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background-color: #F5F5F7;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, 'Plus Jakarta Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    padding: 64px 16px;
    color: #1D1D1F;
  }
  .wrapper {
    max-width: 480px;
    margin: 0 auto;
  }
  .card {
    background: #FFFFFF;
    border-radius: 28px;
    overflow: hidden;
    border: 1px solid #E8E8ED;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
    padding: 44px 40px;
  }
  .hero-icon-wrap {
    width: 48px;
    height: 48px;
    background: #EBFBEE;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
  }
  .hero-icon-wrap svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: #34C759;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .hero-title {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    font-weight: 700;
    font-size: 28px;
    color: #1D1D1F;
    letter-spacing: -0.6px;
    line-height: 1.25;
    margin-bottom: 12px;
  }
  .hero-subtitle {
    color: #86868B;
    font-size: 15px;
    font-weight: 400;
    line-height: 1.5;
    margin-bottom: 32px;
  }
  .greeting {
    font-weight: 600;
    font-size: 16px;
    color: #1D1D1F;
    margin-bottom: 12px;
  }
  .body-text {
    font-size: 15px;
    color: #515154;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .info-box {
    background: #EBFBEE;
    border-radius: 16px;
    padding: 16px 20px;
    margin: 32px 0;
    border: 1px solid #D1F7D6;
  }
  .info-text {
    font-size: 13.5px;
    color: #248A3D;
    line-height: 1.55;
    font-weight: 500;
  }
  .footer {
    margin-top: 24px;
    padding: 0 8px;
  }
  .footer p {
    font-size: 12px;
    color: #86868B;
    line-height: 1.6;
    margin-bottom: 6px;
  }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="hero-icon-wrap">
      <svg viewBox="0 0 24 24">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    </div>
    <h1 class="hero-title">Akun Anda<br>telah dipulihkan.</h1>
    <p class="hero-subtitle">Permintaan penghapusan akun Anda telah dibatalkan dan akun kembali aktif normal.</p>
    <p class="greeting">Halo, {{.Name}}</p>
    <p class="body-text">Kami senang memberi tahu Anda bahwa akun Salesview yang terhubung dengan <span style="color: #1D1D1F; font-weight: 500;">{{.Email}}</span> telah berhasil dipulihkan atas permintaan Anda melalui Support.</p>
    <p class="body-text">Seluruh data Anda tetap utuh, dan status akun Anda beserta pengguna di dalamnya kini kembali aktif. Anda sudah dapat melakukan login seperti biasa.</p>
    <div class="info-box">
      <p class="info-text">Selamat datang kembali! Seluruh layanan dan fitur langganan Anda kini siap digunakan kembali secara penuh.</p>
    </div>
  </div>
  <div class="footer">
    <p>PT Griya Innovation Labs &middot;</p>
    <p>&copy; {{.Year}} PT Griya Innovation Labs. All rights reserved.</p>
  </div>
</div>
</body>
</html>`

const DeletionWarningEmailTemplate = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Peringatan Penghapusan Akun Permanen</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=SF+Pro+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background-color: #F5F5F7;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, 'Plus Jakarta Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    padding: 64px 16px;
    color: #1D1D1F;
  }
  .wrapper {
    max-width: 480px;
    margin: 0 auto;
  }
  .card {
    background: #FFFFFF;
    border-radius: 28px;
    overflow: hidden;
    border: 1px solid #E8E8ED;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
    padding: 44px 40px;
  }
  .hero-icon-wrap {
    width: 48px;
    height: 48px;
    background: #FFF0F0;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
  }
  .hero-icon-wrap svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: #FF3B30;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .hero-title {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    font-weight: 700;
    font-size: 28px;
    color: #1D1D1F;
    letter-spacing: -0.6px;
    line-height: 1.25;
    margin-bottom: 12px;
  }
  .hero-subtitle {
    color: #FF3B30;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.5;
    margin-bottom: 32px;
  }
  .greeting {
    font-weight: 600;
    font-size: 16px;
    color: #1D1D1F;
    margin-bottom: 12px;
  }
  .body-text {
    font-size: 15px;
    color: #515154;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .info-box {
    background: #FFF0F0;
    border-radius: 16px;
    padding: 16px 20px;
    margin: 32px 0;
    border: 1px solid #FFD5D5;
  }
  .info-text {
    font-size: 13.5px;
    color: #FF3B30;
    line-height: 1.55;
    font-weight: 600;
  }
  .footer {
    margin-top: 24px;
    padding: 0 8px;
  }
  .footer p {
    font-size: 12px;
    color: #86868B;
    line-height: 1.6;
    margin-bottom: 6px;
  }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="hero-icon-wrap">
      <svg viewBox="0 0 24 24">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
    <h1 class="hero-title">Peringatan<br>terakhir akun Anda.</h1>
    <p class="hero-subtitle">Akun Anda akan segera dihapus secara permanen dalam {{.DaysRemaining}} hari.</p>
    <p class="greeting">Halo, {{.Name}}</p>
    <p class="body-text">Akun Salesview Anda yang terhubung dengan <span style="color: #1D1D1F; font-weight: 500;">{{.Email}}</span> dijadwalkan untuk dihapus secara permanen pada tanggal <strong style="color: #1D1D1F;">{{.ScheduledDate}}</strong>.</p>
    <div class="info-box">
      <p class="info-text">Peringatan: Tinggal {{.DaysRemaining}} hari tersisa. Setelah melewati batas waktu tersebut, seluruh data pribadi (PII), berkas unggahan, audit logs yang teridentifikasi, dan token akses Anda akan dibersihkan sepenuhnya. Tindakan ini TIDAK dapat dibatalkan.</p>
    </div>
    <p class="body-text">Jika Anda ingin mempertahankan akun Anda, silakan hubungi tim Support kami di support@gilabs.id hari ini sebelum proses pembersihan dimulai.</p>
  </div>
  <div class="footer">
    <p>PT Griya Innovation Labs &middot;</p>
    <p>&copy; {{.Year}} PT Griya Innovation Labs. All rights reserved.</p>
  </div>
</div>
</body>
</html>`
