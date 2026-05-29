package com.gilabs.gims.gims_pos

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
import android.util.Base64
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
	private val CHANNEL = "gims_pos/usb_printer"
	private val USB_PERMISSION_ACTION = "com.gilabs.gims.USB_PERMISSION"

	companion object {
		@JvmStatic
		private var pendingBase64: String? = null
		@JvmStatic
		private var pendingVendor: Int? = null
		@JvmStatic
		private var pendingProduct: Int? = null
		@JvmStatic
		private var pendingDeviceName: String? = null
	}

	private val usbPermissionReceiver = object : BroadcastReceiver() {
		override fun onReceive(context: Context?, intent: Intent?) {
			if (intent == null) return
			if (intent.action != USB_PERMISSION_ACTION) return
			val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
			val device: UsbDevice? = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
			if (granted && device != null) {
				// attempt to print pending bytes
				val base64 = pendingBase64
				if (base64 != null) {
					// perform printing on separate thread
					Thread {
						printRawToUsbInternal(base64, pendingVendor, pendingProduct, pendingDeviceName)
						// clear pending
						pendingBase64 = null
						pendingVendor = null
						pendingProduct = null
						pendingDeviceName = null
					}.start()
				}
			}
		}
	}

	override fun onStart() {
		super.onStart()
		val filter = IntentFilter(USB_PERMISSION_ACTION)
		registerReceiver(usbPermissionReceiver, filter)
	}

	override fun onStop() {
		super.onStop()
		try {
			unregisterReceiver(usbPermissionReceiver)
		} catch (_: Exception) {}
	}

	override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
		super.configureFlutterEngine(flutterEngine)

		MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call: MethodCall, result: MethodChannel.Result ->
			when (call.method) {
				"printRaw" -> {
					val base64 = call.argument<String>("bytes") ?: ""
					val vendorId = call.argument<Int>("vendorId")
					val productId = call.argument<Int>("productId")
					val deviceName = call.argument<String>("deviceName")
					val ok = handlePrintRawRequest(base64, vendorId, productId, deviceName)
					result.success(ok)
				}
				else -> result.notImplemented()
			}
		}
	}

	private fun handlePrintRawRequest(base64: String, vendorId: Int?, productId: Int?, deviceName: String?): Boolean {
		// Try immediate print; if permission missing, request and queue pending
		val success = printRawToUsbInternal(base64, vendorId, productId, deviceName)
		if (!success) {
			// queue pending and request permission
			pendingBase64 = base64
			pendingVendor = vendorId
			pendingProduct = productId
			pendingDeviceName = deviceName

			val usbManager = getSystemService(Context.USB_SERVICE) as UsbManager
			val devices: HashMap<String, UsbDevice> = usbManager.deviceList
			val target: UsbDevice? = devices.values.find { dev ->
				when {
					deviceName != null && deviceName.isNotEmpty() -> dev.productName != null && dev.productName.contains(deviceName)
					vendorId != null && productId != null -> dev.vendorId == vendorId && dev.productId == productId
					else -> false
				}
			}
			val useDevice = target ?: devices.values.firstOrNull()
			if (useDevice != null) {
				val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
				val permissionIntent = PendingIntent.getBroadcast(this, 0, Intent(USB_PERMISSION_ACTION), flags)
				usbManager.requestPermission(useDevice, permissionIntent)
			}
		}
		return success
	}

	private fun printRawToUsbInternal(base64: String, vendorId: Int?, productId: Int?, deviceName: String?): Boolean {
		try {
			val usbManager = getSystemService(Context.USB_SERVICE) as UsbManager
			val devices: HashMap<String, UsbDevice> = usbManager.deviceList

			val target: UsbDevice? = devices.values.find { dev ->
				when {
					deviceName != null && deviceName.isNotEmpty() -> dev.productName != null && dev.productName.contains(deviceName)
					vendorId != null && productId != null -> dev.vendorId == vendorId && dev.productId == productId
					else -> false
				}
			}

			val useDevice = target ?: devices.values.firstOrNull()
			if (useDevice == null) return false

			if (!usbManager.hasPermission(useDevice)) {
				return false
			}

			val connection: UsbDeviceConnection = usbManager.openDevice(useDevice) ?: return false
			val intf: UsbInterface = (0 until useDevice.interfaceCount).map { useDevice.getInterface(it) }.firstOrNull { it != null } ?: return false
			if (!connection.claimInterface(intf, true)) return false

			val outEndpoint: UsbEndpoint? = (0 until intf.endpointCount).map { intf.getEndpoint(it) }.firstOrNull { ep -> ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK && ep.direction == UsbConstants.USB_DIR_OUT }
			if (outEndpoint == null) {
				connection.releaseInterface(intf)
				return false
			}

			val bytes = Base64.decode(base64, Base64.DEFAULT)
			var offset = 0
			val chunkSize = outEndpoint.maxPacketSize
			while (offset < bytes.size) {
				val toSend = bytes.copyOfRange(offset, kotlin.math.min(offset + chunkSize, bytes.size))
				val res = connection.bulkTransfer(outEndpoint, toSend, toSend.size, 2000)
				if (res <= 0) {
					connection.releaseInterface(intf)
					connection.close()
					return false
				}
				offset += res
			}

			connection.releaseInterface(intf)
			connection.close()
			return true
		} catch (e: Exception) {
			return false
		}
	}
}
