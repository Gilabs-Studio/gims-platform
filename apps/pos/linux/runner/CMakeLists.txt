cmake_minimum_required(VERSION 3.13)
project(runner LANGUAGES CXX)

# Define the application target. To change its name, change BINARY_NAME in the
# top-level CMakeLists.txt, not the value here, or `flutter run` will no longer
# work.
#
# Any new source files that you add to the application should be added here.
set(SRC_FILES
  "main.cc"
  "my_application.cc"
  "${FLUTTER_MANAGED_DIR}/generated_plugin_registrant.cc"
)

# Optionally include linux bluetooth plugin if libbluetooth and headers are available
find_library(BLUETOOTH_LIB bluetooth)
find_path(BLUETOOTH_INCLUDE bluetooth/bluetooth.h)
if (BLUETOOTH_LIB AND BLUETOOTH_INCLUDE)
  list(APPEND SRC_FILES "linux_bluetooth_plugin.cc")
  add_definitions(-DLINUX_BLUETOOTH_PLUGIN_AVAILABLE=1)
  # make include available to the target later
  set(BLUETOOTH_FOUND TRUE)
endif()

add_executable(${BINARY_NAME} ${SRC_FILES})

# Apply the standard set of build settings. This can be removed for applications
# that need different build settings.
apply_standard_settings(${BINARY_NAME})

# Add preprocessor definitions for the application ID.
add_definitions(-DAPPLICATION_ID="${APPLICATION_ID}")

# Add dependency libraries. Add any application-specific dependencies here.
target_link_libraries(${BINARY_NAME} PRIVATE flutter)
target_link_libraries(${BINARY_NAME} PRIVATE PkgConfig::GTK)
if (BLUETOOTH_FOUND)
  target_include_directories(${BINARY_NAME} PRIVATE ${BLUETOOTH_INCLUDE})
  target_link_libraries(${BINARY_NAME} PRIVATE ${BLUETOOTH_LIB})
endif()

target_include_directories(${BINARY_NAME} PRIVATE "${CMAKE_SOURCE_DIR}")
