#include <flutter_linux/flutter_linux.h>
#include <gtk/gtk.h>
#include <sys/socket.h>
#include <unistd.h>
#include <bluetooth/bluetooth.h>
#include <bluetooth/rfcomm.h>
#include <string.h>
#include <stdlib.h>
#include <glib.h>

static FlMethodChannel* channel = nullptr;

static void method_call_cb(FlMethodChannel* channel,
                           FlMethodCall* method_call,
                           gpointer user_data) {
  const gchar* method = fl_method_call_get_name(method_call);

  if (g_strcmp0(method, "printRaw") == 0) {
    FlValue* args = fl_method_call_get_args(method_call);
    const char* b64 = fl_value_get_string(fl_value_lookup_string(args, "bytes"));
    const char* addr = nullptr;
    int channel_num = 1;
    FlValue* addrVal = fl_value_lookup_string(args, "address");
    if (addrVal != nullptr) {
      addr = fl_value_get_string(addrVal);
    }
    FlValue* chVal = fl_value_lookup_string(args, "channel");
    if (chVal != nullptr) {
      channel_num = fl_value_get_int(chVal);
    }

    gboolean success = FALSE;
    if (b64 != nullptr && addr != nullptr) {
      gsize out_len = 0;
      guchar* data = g_base64_decode(b64, &out_len);
      if (data != nullptr && out_len > 0) {
        // RFCOMM socket
        int s = socket(AF_BLUETOOTH, SOCK_STREAM, BTPROTO_RFCOMM);
        if (s >= 0) {
          struct sockaddr_rc rcaddr = { 0 };
          rcaddr.rc_family = AF_BLUETOOTH;
          str2ba(addr, &rcaddr.rc_bdaddr);
          rcaddr.rc_channel = (uint8_t)channel_num;
          if (connect(s, (struct sockaddr*)&rcaddr, sizeof(rcaddr)) == 0) {
            ssize_t sent = send(s, data, out_len, 0);
            if (sent == (ssize_t)out_len) success = TRUE;
            close(s);
          } else {
            close(s);
          }
        }
        g_free(data);
      }
    }

    FlValue* result = fl_value_new_bool(success);
    FlMethodResponse* response = FL_METHOD_RESPONSE(fl_method_success_response_new(result));
    fl_method_call_respond(method_call, response, nullptr, nullptr);
    fl_value_unref(result);
    return;
  }

  FlMethodResponse* response = FL_METHOD_RESPONSE(fl_method_not_implemented_response_new());
  fl_method_call_respond(method_call, response, nullptr, nullptr);
}

void linux_bluetooth_plugin_register_with_view(FlView* view) {
  FlBinaryMessenger* messenger = fl_view_get_binary_messenger(view);
  channel = fl_method_channel_new(fl_binary_messenger_get_messenger(messenger),
                                  "gims_pos/linux_bluetooth",
                                  FL_METHOD_CODEC(fl_standard_method_codec_get_instance()));
  fl_method_channel_set_method_call_handler(channel, method_call_cb, nullptr, nullptr);
}
